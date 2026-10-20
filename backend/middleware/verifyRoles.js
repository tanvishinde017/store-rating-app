// Role-based authorization middleware.
// `roles` may be a single string or an array of allowed roles.
const AppError = require('../utils/AppError');

function verifyRoles(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    const userRole = req.user && req.user.role;

    if (!userRole) {
      return next(new AppError('Unauthorized', 401));
    }

    if (!allowed.includes(userRole)) {
      return next(new AppError('Forbidden: insufficient role permissions.', 403));
    }

    next();
  };
}

module.exports = verifyRoles;
