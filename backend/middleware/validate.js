// Express middleware that runs the express-validator rules and rejects the
// request with a 400 when any rule fails.
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const details = errors.array().map((e) => e.msg);
  return next(new AppError(details[0], 400));
}

module.exports = validate;
