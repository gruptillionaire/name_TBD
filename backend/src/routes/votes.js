const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate, requireRegistered } = require('../middleware/auth');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const router = express.Router();

// Vote on a comment (like or dislike)
router.post('/', authenticate, requireRegistered, async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { commentId, voteType } = req.body;

    if (!commentId) {
      throw new BadRequestError('commentId is required');
    }

    if (voteType !== 1 && voteType !== -1) {
      throw new BadRequestError('voteType must be 1 (like) or -1 (dislike)');
    }

    // Check if comment exists
    const commentResult = await client.query(
      'SELECT id FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      throw new NotFoundError('Comment not found');
    }

    // Check for existing vote
    const existingVote = await client.query(
      'SELECT id, vote_type FROM votes WHERE user_id = $1 AND comment_id = $2',
      [req.user.id, commentId]
    );

    if (existingVote.rows.length > 0) {
      const oldVoteType = existingVote.rows[0].vote_type;

      if (oldVoteType === voteType) {
        // Same vote - remove it (toggle off)
        await client.query(
          'DELETE FROM votes WHERE id = $1',
          [existingVote.rows[0].id]
        );

        // Update comment counts
        if (voteType === 1) {
          await client.query(
            'UPDATE comments SET likes = likes - 1 WHERE id = $1',
            [commentId]
          );
        } else {
          await client.query(
            'UPDATE comments SET dislikes = dislikes - 1 WHERE id = $1',
            [commentId]
          );
        }

        await client.query('COMMIT');
        return res.json({ message: 'Vote removed', voteType: null });
      } else {
        // Different vote - update it
        await client.query(
          'UPDATE votes SET vote_type = $1 WHERE id = $2',
          [voteType, existingVote.rows[0].id]
        );

        // Update comment counts (swap)
        if (voteType === 1) {
          await client.query(
            'UPDATE comments SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = $1',
            [commentId]
          );
        } else {
          await client.query(
            'UPDATE comments SET likes = likes - 1, dislikes = dislikes + 1 WHERE id = $1',
            [commentId]
          );
        }

        await client.query('COMMIT');
        return res.json({ message: 'Vote updated', voteType });
      }
    }

    // Create new vote
    const voteId = crypto.randomUUID();
    await client.query(
      'INSERT INTO votes (id, user_id, comment_id, vote_type, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [voteId, req.user.id, commentId, voteType]
    );

    // Update comment counts
    if (voteType === 1) {
      await client.query(
        'UPDATE comments SET likes = likes + 1 WHERE id = $1',
        [commentId]
      );
    } else {
      await client.query(
        'UPDATE comments SET dislikes = dislikes + 1 WHERE id = $1',
        [commentId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Vote recorded', voteType });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Remove vote from a comment
router.delete('/:commentId', authenticate, requireRegistered, async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { commentId } = req.params;

    const existingVote = await client.query(
      'SELECT id, vote_type FROM votes WHERE user_id = $1 AND comment_id = $2',
      [req.user.id, commentId]
    );

    if (existingVote.rows.length === 0) {
      throw new NotFoundError('Vote not found');
    }

    const voteType = existingVote.rows[0].vote_type;

    await client.query(
      'DELETE FROM votes WHERE id = $1',
      [existingVote.rows[0].id]
    );

    // Update comment counts
    if (voteType === 1) {
      await client.query(
        'UPDATE comments SET likes = likes - 1 WHERE id = $1',
        [commentId]
      );
    } else {
      await client.query(
        'UPDATE comments SET dislikes = dislikes - 1 WHERE id = $1',
        [commentId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Vote removed' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
