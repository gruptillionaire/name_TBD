const express = require('express');
const db = require('../config/db');
const { BadRequestError } = require('../utils/errors');

const router = express.Router();

// Get heatmap data for map visualization
router.get('/', async (req, res, next) => {
  try {
    const { minLat, maxLat, minLng, maxLng, date } = req.query;

    // Default to today if no date specified
    const targetDate = date || new Date().toISOString().split('T')[0];

    // If bounds are provided, filter by geographic area
    let boundFilter = '';
    const params = [targetDate];

    if (minLat && maxLat && minLng && maxLng) {
      boundFilter = `AND ST_Within(
        p.location::geometry,
        ST_MakeEnvelope($2, $3, $4, $5, 4326)
      )`;
      params.push(
        parseFloat(minLng),
        parseFloat(minLat),
        parseFloat(maxLng),
        parseFloat(maxLat)
      );
    }

    // Get aggregated comment data by pin
    const pinResult = await db.query(
      `SELECT
         p.id,
         p.name,
         ST_X(p.location::geometry) as lng,
         ST_Y(p.location::geometry) as lat,
         p.city,
         p.country,
         COUNT(c.id) as comment_count,
         COALESCE(SUM(c.likes - c.dislikes), 0) as total_score,
         MAX(c.likes - c.dislikes) as top_comment_score
       FROM pins p
       LEFT JOIN comments c ON c.pin_id = p.id AND DATE(c.created_at) = $1
       WHERE 1=1 ${boundFilter}
       GROUP BY p.id
       HAVING COUNT(c.id) > 0
       ORDER BY total_score DESC
       LIMIT 200`,
      params
    );

    // Get aggregated data by city
    const cityResult = await db.query(
      `SELECT
         c.city,
         c.country,
         COUNT(c.id) as comment_count,
         SUM(c.likes - c.dislikes) as total_score
       FROM comments c
       WHERE DATE(c.created_at) = $1 AND c.city IS NOT NULL
       GROUP BY c.city, c.country
       ORDER BY total_score DESC
       LIMIT 100`,
      [targetDate]
    );

    // Get aggregated data by country
    const countryResult = await db.query(
      `SELECT
         c.country,
         COUNT(c.id) as comment_count,
         SUM(c.likes - c.dislikes) as total_score
       FROM comments c
       WHERE DATE(c.created_at) = $1
       GROUP BY c.country
       ORDER BY total_score DESC
       LIMIT 50`,
      [targetDate]
    );

    // Get top comments that should "pop up" on the map
    const topCommentsResult = await db.query(
      `SELECT
         c.id,
         c.content,
         c.likes,
         c.dislikes,
         (c.likes - c.dislikes) as score,
         p.name as pin_name,
         ST_X(p.location::geometry) as lng,
         ST_Y(p.location::geometry) as lat,
         c.city,
         c.country
       FROM comments c
       LEFT JOIN pins p ON c.pin_id = p.id
       WHERE DATE(c.created_at) = $1
       ORDER BY score DESC
       LIMIT 50`,
      [targetDate]
    );

    res.json({
      date: targetDate,
      pins: pinResult.rows,
      cities: cityResult.rows,
      countries: countryResult.rows,
      topComments: topCommentsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
