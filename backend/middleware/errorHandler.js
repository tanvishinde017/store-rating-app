// Centralized error handler. Handles operational errors and unexpected crashes.
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';

  // Known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof SyntaxError && err.status === 400) {
    statusCode = 400;
    message = 'Invalid JSON body';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry - check unique constraints';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced record not found';
  }

  res.status(statusCode).json({
    status: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
