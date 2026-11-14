const { ZodError } = require('zod');
const { errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  return errorResponse(
    res,
    HTTP_STATUS.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`
  );
};

/**
 * Centralized Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // If headers are already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Validation failed',
      formattedErrors
    );
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Malformed JSON in request body');
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    return errorResponse(res, HTTP_STATUS.BAD_REQUEST, `Upload error: ${err.message}`);
  }

  // Log error stack in development / testing
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled Error:', err);
  }

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors || null;

  return errorResponse(res, statusCode, message, errors);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
