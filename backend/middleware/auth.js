// Verify the JWT token and attach the decoded user to req.user
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return next(new AppError('Access token missing. Please log in.', 401));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Token expired or invalid
      return next(new AppError('Invalid or expired token. Please log in again.', 401));
    }
    req.user = decoded;
    next();
  });
}

module.exports = { authenticateToken };
