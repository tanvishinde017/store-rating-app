const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { validateBody } = require('../utils/validateBody');
const AppError = require('../utils/AppError');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// Public - registers a normal USER (role is always forced to USER)
// ---------------------------------------------------------------------------
router.post(
  '/signup',
  [
    body('name')
      .isString()
      .withMessage('Name must be a string')
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('Name must be 2-60 characters'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isStrongPassword(PASSWORD_RULES).withMessage(PASSWORD_MESSAGE),
    body('address').optional().isString().trim().isLength({ max: 400 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      validateBody(['name', 'email', 'password'], req);

      const { name, email, password } = req.body;
      const { address = '' } = req.body;
      const role = 'USER';

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
// POST /api/auth/login
// Public - returns a JWT access token
// ---------------------------------------------------------------------------
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      validateBody(['email', 'password'], req);

      const { email, password } = req.body;

      const [rows] = await pool.query(
        'SELECT id, name, email, password_hash, role, address, created_at FROM users WHERE email = ?',
        [email]
      );

      const user = rows[0];
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        throw new AppError('Invalid email or password', 401);
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          address: user.address,
          role: user.role,
          created_at: user.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Protected - returns the current user profile (no password hash)
// ---------------------------------------------------------------------------
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, address, role, created_at FROM users WHERE id = ?',
      [req.user.id]
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
// PUT /api/auth/password
// Protected - change password (requires current password)
// ---------------------------------------------------------------------------
router.put(
  '/password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isStrongPassword(PASSWORD_RULES).withMessage(PASSWORD_MESSAGE),
  ],
  validate,
  async (req, res, next) => {
    try {
      validateBody(['currentPassword', 'newPassword'], req);

      const { currentPassword, newPassword } = req.body;

      const [rows] = await pool.query(
        'SELECT id, password_hash FROM users WHERE id = ?',
        [req.user.id]
      );
      const user = rows[0];
      if (!user) {
        return next(new AppError('User not found', 404));
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        throw new AppError('Current password is incorrect', 401);
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
        newPasswordHash,
        req.user.id,
      ]);

      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
