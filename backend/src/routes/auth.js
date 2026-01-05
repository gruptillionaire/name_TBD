const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { BadRequestError, ConflictError } = require('../utils/errors');

const router = express.Router();

// Register a new user (after Firebase signup)
router.post('/register', authenticate, async (req, res, next) => {
  try {
    const { username } = req.body;
    const firebaseUid = req.firebaseUser.uid;

    if (!username || typeof username !== 'string') {
      throw new BadRequestError('Username is required');
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      throw new BadRequestError('Username must be between 3 and 30 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      throw new BadRequestError('Username can only contain letters, numbers, and underscores');
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('User already registered');
    }

    // Check if username is taken
    const usernameTaken = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [trimmedUsername]
    );

    if (usernameTaken.rows.length > 0) {
      throw new ConflictError('Username already taken');
    }

    const userId = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO users (id, firebase_uid, username, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, username, created_at`,
      [userId, firebaseUid, trimmedUsername]
    );

    res.status(201).json({
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
