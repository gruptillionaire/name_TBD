const admin = require('../config/firebase');
const db = require('../config/db');
const { UnauthorizedError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  try {
    if (!admin.isInitialized()) {
      throw new UnauthorizedError('Authentication service not configured');
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user from database
    const result = await db.query(
      'SELECT id, firebase_uid, username, created_at, last_post_date FROM users WHERE firebase_uid = $1',
      [decodedToken.uid]
    );

    if (result.rows.length === 0) {
      // User exists in Firebase but not in our DB - they need to register
      req.firebaseUser = decodedToken;
      req.user = null;
    } else {
      req.firebaseUser = decodedToken;
      req.user = result.rows[0];
    }

    next();
  } catch (error) {
    if (error.code === 'auth/id-token-expired') {
      next(new UnauthorizedError('Token expired'));
    } else if (error.code === 'auth/argument-error') {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

// Middleware that requires user to be registered in our DB
const requireRegistered = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('User not registered'));
  }
  next();
};

module.exports = { authenticate, requireRegistered };
