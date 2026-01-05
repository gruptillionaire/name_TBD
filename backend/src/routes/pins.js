const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate, requireRegistered } = require('../middleware/auth');
const { getNearbyPlaces, reverseGeocode } = require('../services/geocoding');
const { BadRequestError, ConflictError } = require('../utils/errors');

const router = express.Router();

const MIN_PIN_DISTANCE_METERS = 50;

// Get pins near a location
router.get('/', async (req, res, next) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;

    if (!lat || !lng) {
      throw new BadRequestError('lat and lng are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = Math.min(parseFloat(radius) || 1000, 50000);

    const result = await db.query(
      `SELECT
         id,
         name,
         ST_X(location::geometry) as lng,
         ST_Y(location::geometry) as lat,
         google_place_id,
         city,
         country,
         created_at,
         ST_Distance(location, ST_MakePoint($1, $2)::geography) as distance
       FROM pins
       WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
       ORDER BY distance
       LIMIT 100`,
      [longitude, latitude, radiusMeters]
    );

    res.json({ pins: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get Google Places suggestions for pin naming
router.get('/suggest', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      throw new BadRequestError('lat and lng are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    const places = await getNearbyPlaces(latitude, longitude);

    res.json({ suggestions: places });
  } catch (error) {
    next(error);
  }
});

// Create a new pin
router.post('/', authenticate, requireRegistered, async (req, res, next) => {
  try {
    const { name, lat, lng, googlePlaceId } = req.body;

    if (!name || !lat || !lng) {
      throw new BadRequestError('name, lat, and lng are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const trimmedName = name.trim();

    if (trimmedName.length < 1 || trimmedName.length > 200) {
      throw new BadRequestError('Pin name must be between 1 and 200 characters');
    }

    // Check for existing pins within minimum distance
    const nearbyResult = await db.query(
      `SELECT id, name FROM pins
       WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
       LIMIT 1`,
      [longitude, latitude, MIN_PIN_DISTANCE_METERS]
    );

    if (nearbyResult.rows.length > 0) {
      throw new ConflictError(`A pin already exists nearby: "${nearbyResult.rows[0].name}"`);
    }

    // Get city and country via reverse geocoding
    const { city, country } = await reverseGeocode(latitude, longitude);

    if (!country) {
      throw new BadRequestError('Could not determine location country');
    }

    const pinId = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO pins (id, name, location, google_place_id, city, country, created_by, created_at)
       VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6, $7, $8, NOW())
       RETURNING id, name, city, country, created_at`,
      [pinId, trimmedName, longitude, latitude, googlePlaceId || null, city, country, req.user.id]
    );

    res.status(201).json({ pin: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
