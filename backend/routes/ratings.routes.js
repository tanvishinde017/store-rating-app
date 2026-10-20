const express = require('express');
const router = express.Router();

const { body } = require('express-validator');
const { validateBody } = require('../utils/validateBody');
const AppError = require('../utils/AppError');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const verifyRoles = require('../middleware/verifyRoles');

// ---------------------------------------------------------------------------
// POST /api/stores/:id/ratings
// Submit a new rating (1-5) or update the existing one for the current user.
// Enforces one rating per user per store via the UNIQUE(user_id, store_id)
// constraint combined with ON DUPLICATE KEY UPDATE.
// ---------------------------------------------------------------------------
router.post(
  '/:id/ratings',
  authenticateToken,
  verifyRoles(['USER', 'OWNER', 'ADMIN']),
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be an integer between 1 and 5'),
  ],
  validate,
  async (req, res, next) => {
    try {
      validateBody(['rating'], req);

      const storeId = req.params.id;
      const { rating } = req.body;

      // Verify the store exists
      const [storeRows] = await pool.query('SELECT id FROM stores WHERE id = ?', [storeId]);
      if (storeRows.length === 0) {
        return next(new AppError('Store not found', 404));
      }

      // Upsert: insert a new rating or update the existing one for this user.
      const [result] = await pool.query(
        `INSERT INTO ratings (user_id, store_id, rating)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           rating = VALUES(rating),
           updated_at = CURRENT_TIMESTAMP`,
        [req.user.id, storeId, rating]
      );

      // Re-fetch the stored row (its id is not guaranteed on update).
      const [existing] = await pool.query(
        `SELECT r.id, r.rating, r.created_at, r.updated_at, u.id AS user_id, u.name, u.email
         FROM ratings r
         JOIN users u ON u.id = r.user_id
         WHERE r.user_id = ? AND r.store_id = ?`,
        [req.user.id, storeId]
      );

      const [avgRows] = await pool.query(
        'SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count FROM ratings WHERE store_id = ?',
        [storeId]
      );

      res.status(201).json({
        message:
          result.affectedRows === 1
            ? 'Rating submitted successfully'
            : 'Rating updated successfully',
        rating: existing[0],
        avg_rating: Math.round((avgRows[0].avg_rating || 0) * 10) / 10,
        rating_count: avgRows[0].rating_count,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/stores/:id/ratings
// Lists the users who rated a store.
// Permitted for: ADMIN, the store owner, and any signed-in user.
// ---------------------------------------------------------------------------
router.get('/:id/ratings', authenticateToken, async (req, res, next) => {
  try {
    const [storeRows] = await pool.query(
      'SELECT id, name, owner_id FROM stores WHERE id = ?',
      [req.params.id]
    );
    if (storeRows.length === 0) {
      return next(new AppError('Store not found', 404));
    }
    const store = storeRows[0];

    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.created_at, r.updated_at, u.id AS user_id, u.name, u.email
       FROM ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.store_id = ?
       ORDER BY r.created_at ASC`,
      [store.id]
    );

    const [avgRows] = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count FROM ratings WHERE store_id = ?',
      [store.id]
    );

    res.json({
      store_id: store.id,
      store_name: store.name,
      avg_rating: Math.round((avgRows[0].avg_rating || 0) * 10) / 10,
      rating_count: avgRows[0].rating_count,
      ratings: rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
