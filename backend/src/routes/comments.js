const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate, requireRegistered } = require('../middleware/auth');
const { dailyPostLimit } = require('../middleware/rateLimit');
const { moderateContent } = require('../services/moderation');
const { translate } = require('../services/translation');
const { reverseGeocode } = require('../services/geocoding');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

const router = express.Router();

// Get comments with hierarchy filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      country,
      city,
      pin_id,
      sort = 'top',
      date,
      page = 1,
      limit = 20,
      lang
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    // Build hierarchy filter
    if (pin_id) {
      whereClause = `WHERE c.pin_id = $${paramIndex}`;
      params.push(pin_id);
      paramIndex++;
    } else if (city && country) {
      whereClause = `WHERE c.country = $${paramIndex} AND c.city = $${paramIndex + 1}`;
      params.push(country, city);
      paramIndex += 2;
    } else if (country) {
      whereClause = `WHERE c.country = $${paramIndex}`;
      params.push(country);
      paramIndex++;
    }

    // Date filter
    if (date) {
      const datePrefix = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${datePrefix} DATE(c.created_at) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    // Sort order
    let orderBy;
    switch (sort) {
      case 'new':
      case 'newest':
        orderBy = 'c.created_at DESC';
        break;
      case 'old':
      case 'oldest':
        orderBy = 'c.created_at ASC';
        break;
      case 'liked':
        orderBy = 'c.likes DESC, c.created_at DESC';
        break;
      case 'disliked':
        orderBy = 'c.dislikes DESC, c.created_at DESC';
        break;
      case 'top':
      default:
        orderBy = '(c.likes - c.dislikes) DESC, c.created_at DESC';
    }

    params.push(limitNum, offset);

    const result = await db.query(
      `SELECT
         c.id,
         c.content,
         c.translated_content,
         c.country,
         c.city,
         c.likes,
         c.dislikes,
         c.created_at,
         u.username,
         p.id as pin_id,
         p.name as pin_name
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN pins p ON c.pin_id = p.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    // Translate if requested
    let comments = result.rows;
    if (lang && comments.length > 0) {
      comments = await Promise.all(
        comments.map(async (comment) => {
          // Check if we have cached translation
          if (comment.translated_content && comment.translated_content[lang]) {
            return { ...comment, displayContent: comment.translated_content[lang] };
          }

          // Translate on demand
          const translatedText = await translate(comment.content, lang);
          return { ...comment, displayContent: translatedText };
        })
      );
    }

    // Get total count for pagination
    const countParams = params.slice(0, -2);
    const countResult = await db.query(
      `SELECT COUNT(*) FROM comments c ${whereClause}`,
      countParams
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    res.json({
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single comment
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    const result = await db.query(
      `SELECT
         c.id,
         c.content,
         c.translated_content,
         c.country,
         c.city,
         c.likes,
         c.dislikes,
         c.created_at,
         u.username,
         p.id as pin_id,
         p.name as pin_name
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN pins p ON c.pin_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Comment not found');
    }

    let comment = result.rows[0];

    if (lang) {
      if (comment.translated_content && comment.translated_content[lang]) {
        comment.displayContent = comment.translated_content[lang];
      } else {
        comment.displayContent = await translate(comment.content, lang);
      }
    }

    res.json({ comment });
  } catch (error) {
    next(error);
  }
});

// Create a new comment
router.post('/', authenticate, requireRegistered, dailyPostLimit, async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { content, country, city, pinId, newPin } = req.body;

    if (!content || typeof content !== 'string') {
      throw new BadRequestError('Content is required');
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length < 1 || trimmedContent.length > 1000) {
      throw new BadRequestError('Content must be between 1 and 1000 characters');
    }

    // Moderate content
    const moderation = moderateContent(trimmedContent);
    if (!moderation.isClean) {
      throw new ForbiddenError('Comment contains inappropriate content');
    }

    let finalPinId = pinId || null;
    let finalCity = city || null;
    let finalCountry = country;

    // Create new pin if provided
    if (newPin && newPin.lat && newPin.lng && newPin.name) {
      const { city: geoCity, country: geoCountry } = await reverseGeocode(newPin.lat, newPin.lng);

      if (!geoCountry) {
        throw new BadRequestError('Could not determine location country');
      }

      // Check for existing pins nearby
      const nearbyResult = await client.query(
        `SELECT id, name FROM pins
         WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, 50)
         LIMIT 1`,
        [newPin.lng, newPin.lat]
      );

      if (nearbyResult.rows.length > 0) {
        // Use existing pin instead
        finalPinId = nearbyResult.rows[0].id;
      } else {
        // Create new pin
        const pinId = crypto.randomUUID();
        await client.query(
          `INSERT INTO pins (id, name, location, google_place_id, city, country, created_by, created_at)
           VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6, $7, $8, NOW())`,
          [pinId, newPin.name.trim(), newPin.lng, newPin.lat, newPin.googlePlaceId || null, geoCity, geoCountry, req.user.id]
        );
        finalPinId = pinId;
      }

      finalCity = geoCity;
      finalCountry = geoCountry;
    }

    if (!finalCountry) {
      throw new BadRequestError('Country is required');
    }

    const commentId = crypto.randomUUID();
    const result = await client.query(
      `INSERT INTO comments (id, user_id, pin_id, city, country, content, likes, dislikes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, NOW())
       RETURNING id, content, country, city, likes, dislikes, created_at`,
      [commentId, req.user.id, finalPinId, finalCity, finalCountry, trimmedContent]
    );

    // Update user's last post date
    await client.query(
      'UPDATE users SET last_post_date = CURRENT_DATE WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    res.status(201).json({ comment: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
