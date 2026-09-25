export class AppError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500
  let message = err.message || 'Internal server error.'

  if (err.name === 'ValidationError') {
    status = 400
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join(', ')
  } else if (err.code === 11000) {
    status = 409
    message = 'Duplicate value already exists.'
  } else if (err.name === 'CastError') {
    status = 400
    message = 'Invalid identifier supplied.'
  } else if (status >= 500) {
    message = 'Internal server error.'
  }

  if (req.headers['x-debug'] === '1') message = `${message} :: ${err.stack}`

  res.status(status).json({ error: message })
}