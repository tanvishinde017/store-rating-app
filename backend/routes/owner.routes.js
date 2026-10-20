const express = require('express');
const router = express.Router();

const AppError = require('../utils/AppError');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const verifyRoles = require('../middleware/verifyRoles');

// ---------------------------------------------------------------------------
// GET /api/owner/dashboard
// Overview of the stores owned by the signed-in owner.
// ---------------------------------------------------------------------------
router.get('/dashboard', authenticateToken, verifyRoles('OWNER'), async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    const [storesRows] = await pool.query(
      `SELECT s.id, s.name, s.email, s.address, s.created_at,
              AVG(r.rating) AS avg_rating, COUNT(r.id) AS rating_count
       FROM stores s
       LEFT JOIN ratings r ON r.store_id = s.id
       WHERE s.owner_id = ?
       GROUP BY s.id, s.name, s.email, s.address, s.created_at
       ORDER BY s.name ASC`,
      [ownerId]
    );

    const stores = storesRows.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      address: s.address,
      created_at: s.created_at,
      avg_rating: s.avg_rating ? Math.round(s.avg_rating * 10) / 10 : 0,
      rating_count: s.rating_count || 0,
    }));

    const totalRatings = stores.reduce((sum, s) => sum + s.rating_count, 0);
    const avgOfAvgs = stores.length
      ? Math.round((stores.reduce((sum, s) => sum + s.avg_rating, 0) / stores.length) * 10) / 10
      : 0;

    res.json({
      owner_id: ownerId,
      store_count: stores.length,
      total_ratings: totalRatings,
      avg_rating: avgOfAvgs,
      stores,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/owner/stores
// Only the stores owned by the signed-in owner.
// ---------------------------------------------------------------------------
router.get('/stores', authenticateToken, verifyRoles('OWNER'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.email, s.address, s.created_at,
              (SELECT AVG(rating) FROM ratings WHERE store_id = s.id) AS avg_rating,
              (SELECT COUNT(*) FROM ratings WHERE store_id = s.id) AS rating_count
       FROM stores s
       WHERE s.owner_id = ?
       ORDER BY s.name ASC`,
      [req.user.id]
    );

    const stores = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      address: r.address,
      created_at: r.created_at,
      avg_rating: r.avg_rating ? Math.round(r.avg_rating * 10) / 10 : 0,
      rating_count: r.rating_count || 0,
    }));

    res.json({ stores });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/owner/stores/:id/ratings
// The users who rated one of the owner's stores.
// ---------------------------------------------------------------------------
router.get(
  '/stores/:id/ratings',
  authenticateToken,
  verifyRoles('OWNER'),
  async (req, res, next) => {
    try {
      const [storeRows] = await pool.query(
        'SELECT id, name, owner_id FROM stores WHERE id = ?',
        [req.params.id]
      );
      if (storeRows.length === 0) {
        return next(new AppError('Store not found', 404));
      }
      const store = storeRows[0];
      if (Number(store.owner_id) !== Number(req.user.id)) {
        return next(new AppError('Forbidden: this store does not belong to you', 403));
      }

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
  }
);

module.exports = router;
