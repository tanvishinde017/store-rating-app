const express = require('express');
const router = express.Router();

const { body } = require('express-validator');
const { validateBody } = require('../utils/validateBody');
const AppError = require('../utils/AppError');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const verifyRoles = require('../middleware/verifyRoles');
const { optionalAuth } = require('../middleware/optionalAuth');

// Allowed sorting columns and searchable columns for stores
const SORTABLE_STORE_COLUMNS = ['name', 'email', 'address', 'created_at'];

function applyStoreSearchAndSort(query, req) {
  if (req.query.search && req.query.search.trim()) {
    const term = `%${req.query.search.trim()}%`;
    query.where = query.where
      ? `${query.where} AND (s.name LIKE ? OR s.email LIKE ? OR s.address LIKE ?)`
      : 'WHERE (s.name LIKE ? OR s.email LIKE ? OR s.address LIKE ?)';
    query.values = query.values || [];
    query.values.push(term, term, term);
  }

  if (req.query.owner_id && req.query.owner_id !== 'all') {
    query.where = query.where ? `${query.where} AND s.owner_id = ?` : 'WHERE s.owner_id = ?';
    query.values = query.values || [];
    query.values.push(Number(req.query.owner_id));
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const offset = (page - 1) * limit;
  query.values = query.values || [];
  query.values.push(limit, offset);

  let sortField = 's.id';
  let sortOrder = 'ASC';
  if (req.query.sortBy && SORTABLE_STORE_COLUMNS.includes(req.query.sortBy)) {
    sortField = `s.${req.query.sortBy}`;
  }
  if (req.query.sortOrder && ['asc', 'desc'].includes(String(req.query.sortOrder).toLowerCase())) {
    sortOrder = String(req.query.sortOrder).toLowerCase();
  }
  query.order = `ORDER BY ${sortField} ${sortOrder}`;
  query.page = page;
  query.limit = limit;
  query.offset = offset;
}

// ---------------------------------------------------------------------------
// GET /api/stores - public list, search / filter / sort / paginate
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const query = { where: '', values: [] };
    applyStoreSearchAndSort(query, req);

    const countQuery = `SELECT COUNT(*) AS total FROM stores s ${query.where}`;
    const [countRows] = await pool.query(countQuery, query.values.slice(0, query.values.length - 2));
    const total = countRows[0].total;

    const dataQuery = `
      SELECT
        s.id, s.name, s.email, s.address, s.owner_id, u.name AS owner_name, s.created_at,
        (SELECT AVG(rating) FROM ratings WHERE store_id = s.id) AS avg_rating,
        (SELECT COUNT(*) FROM ratings WHERE store_id = s.id) AS rating_count,
        (SELECT rating FROM ratings WHERE store_id = s.id AND user_id = ?) AS user_rating
      FROM stores s
      LEFT JOIN users u ON u.id = s.owner_id
      ${query.where}
      ${query.order}
      LIMIT ? OFFSET ?
    `;
    const currentUserId = req.user ? req.user.id : 0;
    const [rows] = await pool.query(dataQuery, [currentUserId, ...query.values]);

    const stores = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      address: r.address,
      owner_id: r.owner_id,
      owner_name: r.owner_name,
      created_at: r.created_at,
      avg_rating: Math.round((r.avg_rating || 0) * 10) / 10,
      rating_count: r.rating_count || 0,
      user_rating: r.user_rating || null,
    }));

    res.json({
      stores,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/stores/:id - store details with average rating
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.email, s.address, s.owner_id, u.name AS owner_name, s.created_at,
              (SELECT AVG(rating) FROM ratings WHERE store_id = s.id) AS avg_rating,
              (SELECT COUNT(*) FROM ratings WHERE store_id = s.id) AS rating_count
       FROM stores s
       LEFT JOIN users u ON u.id = s.owner_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    const store = rows[0];
    if (!store) {
      return next(new AppError('Store not found', 404));
    }

    res.json({
      store: {
        id: store.id,
        name: store.name,
        email: store.email,
        address: store.address,
        owner_id: store.owner_id,
        owner_name: store.owner_name,
        created_at: store.created_at,
        avg_rating: Math.round((store.avg_rating || 0) * 10) / 10,
        rating_count: store.rating_count || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/stores - create a store (ADMIN may assign any owner, OWNER creates own)
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticateToken,
  verifyRoles(['ADMIN', 'OWNER']),
  [
    body('name')
      .isString()
      .withMessage('Store name is required')
      .trim()
      .isLength({ min: 3, max: 60 })
      .withMessage('Store name must be 3-60 characters'),
    body('email').isEmail().withMessage('A valid store email is required'),
    body('address')
      .isString()
      .withMessage('Address is required')
      .trim()
      .isLength({ max: 400 })
      .withMessage('Address must be at most 400 characters'),
    body('owner_id').optional().isInt({ min: 1 }).withMessage('Invalid owner id'),
  ],
  validate,
  async (req, res, next) => {
    try {
      validateBody(['name', 'email', 'address'], req);

      const { name, email, address } = req.body;
      let { owner_id } = req.body;
      const user = req.user;

      if (user.role === 'OWNER') {
        if (owner_id && Number(owner_id) !== Number(user.id)) {
          throw new AppError('Owners can only create stores for themselves', 403);
        }
        owner_id = user.id;
      } else {
        if (!owner_id) {
          throw new AppError('owner_id is required when an admin creates a store', 400);
        }
        const [ownerRows] = await pool.query(
          "SELECT id FROM users WHERE id = ? AND role = 'OWNER'",
          [Number(owner_id)]
        );
        if (ownerRows.length === 0) {
          throw new AppError('owner_id must reference an existing OWNER user', 400);
        }
      }

      const [result] = await pool.query(
        'INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)',
        [name, email, address, owner_id]
      );

      const [store] = await pool.query(
        'SELECT id, name, email, address, owner_id, created_at FROM stores WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        message: 'Store created successfully',
        store: store[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/stores/:id - owner/admin updates a store
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  authenticateToken,
  verifyRoles(['ADMIN', 'OWNER']),
  [
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 3, max: 60 })
      .withMessage('Store name must be 3-60 characters'),
    body('email').optional().isEmail().withMessage('A valid store email is required'),
    body('address')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 400 })
      .withMessage('Address must be at most 400 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const [storeRows] = await pool.query(
        'SELECT id, owner_id FROM stores WHERE id = ?',
        [id]
      );
      if (storeRows.length === 0) {
        return next(new AppError('Store not found', 404));
      }
      const store = storeRows[0];

      if (req.user.role === 'OWNER' && Number(store.owner_id) !== Number(req.user.id)) {
        return next(new AppError('Forbidden: this store does not belong to you', 403));
      }

      const fields = [];
      const values = [];
      ['name', 'email', 'address'].forEach((field) => {
        if (req.body[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      });

      if (fields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      values.push(id);
      await pool.query(`UPDATE stores SET ${fields.join(', ')} WHERE id = ?`, values);

      const [updated] = await pool.query(
        'SELECT id, name, email, address, owner_id, created_at FROM stores WHERE id = ?',
        [id]
      );

      res.json({ message: 'Store updated successfully', store: updated[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/stores/:id - admin or the owner removes the store
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  authenticateToken,
  verifyRoles(['ADMIN', 'OWNER']),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const [storeRows] = await pool.query(
        'SELECT id, owner_id FROM stores WHERE id = ?',
        [id]
      );
      if (storeRows.length === 0) {
        return next(new AppError('Store not found', 404));
      }
      const store = storeRows[0];

      if (req.user.role === 'OWNER' && Number(store.owner_id) !== Number(req.user.id)) {
        return next(new AppError('Forbidden: this store does not belong to you', 403));
      }

      await pool.query('DELETE FROM stores WHERE id = ?', [id]);

      res.json({ message: 'Store deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
