const express = require('express');
const db = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const router = express.Router();

// Get user profile by username
router.get('/:username', async (req, res, next) => {
  try {
    const { username } = req.params;

    const result = await db.query(
      `SELECT username, created_at FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = result.rows[0];

    // Get comment count
    const countResult = await db.query(
      `SELECT COUNT(*) as comment_count FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE LOWER(u.username) = LOWER($1)`,
      [username]
    );

    res.json({
      user: {
        username: user.username,
        createdAt: user.created_at,
        commentCount: parseInt(countResult.rows[0].comment_count, 10)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's comment history
router.get('/:username/comments', async (req, res, next) => {
  try {
    const { username } = req.params;
    const { sort = 'newest', page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // Verify user exists
    const userResult = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const userId = userResult.rows[0].id;

    let orderBy;
    switch (sort) {
      case 'top':
        orderBy = '(c.likes - c.dislikes) DESC, c.created_at DESC';
        break;
      case 'oldest':
        orderBy = 'c.created_at ASC';
        break;
      case 'newest':
      default:
        orderBy = 'c.created_at DESC';
    }

    const result = await db.query(
      `SELECT
         c.id,
         c.content,
         c.country,
         c.city,
         c.likes,
         c.dislikes,
         c.created_at,
         p.name as pin_name,
         p.id as pin_id
       FROM comments c
       LEFT JOIN pins p ON c.pin_id = p.id
       WHERE c.user_id = $1
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [userId, limitNum, offset]
    );

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM comments WHERE user_id = $1',
      [userId]
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    res.json({
      comments: result.rows,
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

module.exports = router;
