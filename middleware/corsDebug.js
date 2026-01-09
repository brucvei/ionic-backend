/**
 * CORS Debug Middleware
 * Logs CORS requests to help with debugging
 */

const corsDebugMiddleware = (req, res, next) => {
  const origin = req.get('origin');
  const method = req.method;
  const url = req.url;

  // Log CORS-related requests
  if (origin) {
    console.log(`🌐 CORS Request: ${method} ${url}`);
    console.log(`📍 Origin: ${origin}`);
    console.log(`🔑 Auth: ${req.get('authorization') ? 'Yes' : 'No'}`);

    // Check if this is a preflight request
    if (method === 'OPTIONS') {
      console.log(`✈️  Preflight request detected`);
    }
  }

  // Add custom headers for debugging
  res.header('X-CORS-Debug', 'enabled');
  res.header('X-Server-Time', new Date().toISOString());

  next();
};

module.exports = corsDebugMiddleware;
