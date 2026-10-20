const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { validateBody } = require('../utils/validateBody');
const AppError = require('../utils/AppError');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const verifyRoles = require('../middleware/verifyRoles');

const ALLOWED_ROLES = ['ADMIN', 'USER', 'OWNER'];
const SORTABLE_USER_COLUMNS = ['id', 'name', 'email', 'address', 'role', 'created_at'];
const SORTABLE_STORE_COLUMNS = ['id', 'name', 'email', 'address', 'created_at'];

const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 16,
  minUppercase: 1,
  minLowercase: 1,
  minNumbers: 0,
  minSymbols: 1,
};

const PASSWORD_MESSAGE =
  'Password must be 8-16 chars with at least one uppercase letter and one special character';

function buildPaging(query, req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  query.page = page;
  query.limit = limit;
  query.offset = (page - 1) * limit;
}

function buildOrder(query, req, allowedColumns, prefix = '') {
  let sortField = `${prefix}id`;
  let sortOrder = 'ASC';
  if (req.query.sortBy && allowedColumns.includes(req.query.sortBy)) {
    sortField = `${prefix}${req.query.sortBy}`;
  }
  if (req.query.sortOrder && ['asc', 'desc'].includes(String(req.query.sortOrder).toLowerCase())) {
    sortOrder = String(req.query.sortOrder).toLowerCase();
  }
  query.order = `ORDER BY ${sortField} ${sortOrder}`;
}

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard - summary totals
// ---------------------------------------------------------------------------
router.get('/dashboard', authenticateToken, verifyRoles('ADMIN'), async (req, res, next) => {
  try {
    const [usersRows] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [storesRows] = await pool.query('SELECT COUNT(*) AS total FROM stores');
    const [ratingsRows] = await pool.query('SELECT COUNT(*) AS total FROM ratings');

    const [roleRows] = await pool.query(
      'SELECT role, COUNT(*) AS total FROM users GROUP BY role'
    );

    res.json({
      totals: {
        users: usersRows[0].total,
        stores: storesRows[0].total,
        ratings: ratingsRows[0].total,
      },
      usersByRole: roleRows.reduce((acc, row) => {
        acc[row.role] = row.total;
        return acc;
      }, {}),
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/users - list with search / role filter / sort / pagination
// ---------------------------------------------------------------------------
router.get('/users', authenticateToken, verifyRoles('ADMIN'), async (req, res, next) => {
  try {
    const query = { where: '', values: [] };
    buildPaging(query, req);
    buildOrder(query, req, SORTABLE_USER_COLUMNS);

    if (req.query.search && req.query.search.trim()) {
      const term = `%${req.query.search.trim()}%`;
      query.where =
        'WHERE (name LIKE ? OR email LIKE ? OR address LIKE ? OR role LIKE ?)';
      query.values.push(term, term, term, term);
    }

    if (req.query.role && ALLOWED_ROLES.includes(req.query.role)) {
      query.where = query.where ? `${query.where} AND role = ?` : 'WHERE role = ?';
      query.values.push(req.query.role);
    }

    const countQuery = `SELECT COUNT(*) AS total FROM users ${query.where}`;
    const [countRows] = await pool.query(countQuery, query.values);
    const total = countRows[0].total;

    const dataQuery = `
      SELECT id, name, email, address, role, created_at
      FROM users
      ${query.where}
      ${query.order}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataQuery, [
      ...query.values,
      query.limit,
      query.offset,
    ]);

    res.json({
      users: rows,
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
// GET /api/admin/users/:id - single user (never returns password_hash)
// ---------------------------------------------------------------------------
router.get('/users/:id', authenticateToken, verifyRoles('ADMIN'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, address, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    const user = rows[0];
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users - create a user with a chosen role
// ---------------------------------------------------------------------------
router.post(
  '/users',
  authenticateToken,
  verifyRoles('ADMIN'),
  [
    body('name')
      .isString()
      .withMessage('Name must be a string')
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('Name must be 2-60 characters'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isStrongPassword(PASSWORD_RULES).withMessage(PASSWORD_MESSAGE),
    body('address')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 400 })
      .withMessage('Address must be at most 400 characters'),
    body('role').isIn(ALLOWED_ROLES).withMessage('Role must be ADMIN, USER, or OWNER'),
  ],
  validate,
  async (req, res, next) => {
    try {
      validateBody(['name', 'email', 'password', 'role'], req);

      const { name, email, password, address = '', role } = req.body;

      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        throw new AppError('Email already registered', 409);
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        `INSERT INTO users (name, email, password_hash, address, role)
         VALUES (?, ?, ?, ?, ?)`,
        [name, email, passwordHash, address, role]
      );

      const [newUser] = await pool.query(
        'SELECT id, name, email, address, role, created_at FROM users WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        message: 'User created successfully',
        user: newUser[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id - update a user
// ---------------------------------------------------------------------------
router.put(
  '/users/:id',
  authenticateToken,
  verifyRoles('ADMIN'),
  [
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('Name must be 2-60 characters'),
    body('email').optional().isEmail().withMessage('A valid email is required'),
    body('address')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 400 })
      .withMessage('Address must be at most 400 characters'),
    body('role').optional().isIn(ALLOWED_ROLES).withMessage('Invalid role'),
    body('password').optional().isStrongPassword(PASSWORD_RULES).withMessage(PASSWORD_MESSAGE),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
      if (rows.length === 0) {
        return next(new AppError('User not found', 404));
      }

      const fields = [];
      const values = [];
      ['name', 'email', 'address', 'role'].forEach((field) => {
        if (req.body[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      });

      if (req.body.password !== undefined) {
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        fields.push('password_hash = ?');
        values.push(passwordHash);
      }

      if (fields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      values.push(id);
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

      const [updated] = await pool.query(
        'SELECT id, name, email, address, role, created_at FROM users WHERE id = ?',
        [id]
      );

      res.json({ message: 'User updated successfully', user: updated[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id - remove a user
// ---------------------------------------------------------------------------
router.delete('/users/:id', authenticateToken, verifyRoles('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      throw new AppError('You cannot delete your own account', 400);
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/stores - list stores with search / sort / pagination
// ---------------------------------------------------------------------------
router.get('/stores', authenticateToken, verifyRoles('ADMIN'), async (req, res, next) => {
  try {
    const query = { where: '', values: [] };
    buildPaging(query, req);
    buildOrder(query, req, SORTABLE_STORE_COLUMNS, 's.');

    if (req.query.search && req.query.search.trim()) {
      const term = `%${req.query.search.trim()}%`;
      query.where = 'WHERE (s.name LIKE ? OR s.email LIKE ? OR s.address LIKE ?)';
      query.values.push(term, term, term);
    }

    if (req.query.owner_id && req.query.owner_id !== 'all') {
      query.where = query.where ? `${query.where} AND s.owner_id = ?` : 'WHERE s.owner_id = ?';
      query.values.push(Number(req.query.owner_id));
    }

    const countQuery = `SELECT COUNT(*) AS total FROM stores s ${query.where}`;
    const [countRows] = await pool.query(countQuery, query.values);
    const total = countRows[0].total;

    const dataQuery = `
      SELECT
        s.id, s.name, s.email, s.address, s.owner_id, u.name AS owner_name, s.created_at,
        (SELECT AVG(rating) FROM ratings WHERE store_id = s.id) AS avg_rating,
        (SELECT COUNT(*) FROM ratings WHERE store_id = s.id) AS rating_count
      FROM stores s
      LEFT JOIN users u ON u.id = s.owner_id
      ${query.where}
      ${query.order}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataQuery, [
      ...query.values,
      query.limit,
      query.offset,
    ]);

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

module.exports = router;
