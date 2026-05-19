export function notFoundMiddleware(_request, response) {
  response.status(404).json({
    success: false,
    message: 'Route not found'
  });
}

export function errorMiddleware(error, _request, response, _next) {
  const statusCode = error.statusCode || error.status || 500;
  response.status(statusCode).json({
    success: false,
    message: error.message || 'Unexpected server error'
  });
}
