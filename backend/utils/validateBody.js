// Validates the request body against the express-validator rules that ran
// before this middleware, and checks that the required fields are present.
const { validationResult } = require('express-validator');
const AppError = require('./AppError');

function validateBody(requiredFields, req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => e.msg);
    throw new AppError(details[0], 400, true);
  }

  const missing = requiredFields.filter((field) => {
    const value = req.body[field];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    const message =
      missing.length === 1
        ? `Missing required field: ${missing[0]}`
        : `Missing required fields: ${missing.join(', ')}`;
    throw new AppError(message, 400);
  }
}

module.exports = { validateBody };
