/**
 * Centralized error handling.
 *
 * All operational errors thrown in services/controllers should be instances of
 * AppError with an `statusCode` and `isOperational` flag. The error middleware
 * converts them into a consistent JSON response envelope and logs unexpected
 * errors without leaking stack traces or sensitive data to the client.
 *
 * Response envelope:
 *   { success: false, error: { code, message }, meta?: {...} }
 */
export class AppError extends Error {
  constructor(statusCode, code, message, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Async route handler wrapper.
 *
 * Express does not catch rejected promises in async route handlers. Wrapping
 * every handler with catchAsync forwards rejections to the error middleware,
 * so we don't need try/catch in every controller.
 */
export function catchAsync(fn) {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * 404 handler for unmatched routes.
 */
export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.originalUrl} not found`))
}

/**
 * Error middleware. Must be registered last (after all routes).
 *
 * In development we include the stack trace for debugging. In production we
 * return a generic message for unexpected errors and never expose internals.
 */
export function errorMiddleware(err, req, res, next) {
  // Default values
  let statusCode = err.statusCode || 500
  let code = err.code || 'INTERNAL_SERVER_ERROR'
  let message = err.message || 'Internal server error'

  // Zod validation errors -> 400 with field details
  if (err.name === 'ZodError') {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = 'Request validation failed'
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    statusCode = 409
    code = 'UNIQUE_CONSTRAINT_VIOLATION'
    message = 'A record with this value already exists'
  }
  if (err.code === 'P2025') {
    statusCode = 404
    code = 'RECORD_NOT_FOUND'
    message = 'Requested record not found'
  }

  // Log unexpected (non-operational) errors — message only, never stack
  const isOperational = err.isOperational !== false
  if (!isOperational || statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', new Date().toISOString(), err.code, err.message)
  }

  const response = {
    success: false,
    error: {
      code,
      message,
    },
  }

  res.status(statusCode).json(response)
}

export default {
  AppError,
  catchAsync,
  notFound,
  errorMiddleware,
}
