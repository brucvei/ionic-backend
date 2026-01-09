/**
 * Configuration for CORS allowed origins
 * This file helps manage which frontend applications can access the API
 */

const allowedOrigins = {
  // Development localhost origins
  development: [
    'http://localhost:4200',     // Angular development server
    'http://localhost:8100',     // Ionic development server
    'http://localhost:3000',     // React development server
    'http://localhost:8080',     // Vue development server
    'http://127.0.0.1:4200',
    'http://127.0.0.1:8100',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
  ],

  // Production frontend URLs
  production: [
    // Add your production frontend URLs here
    // 'https://your-angular-app.vercel.app',
    // 'https://your-angular-app.netlify.app'
  ]
};

// Function to check if origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin

  // Allow any localhost/127.0.0.1 origin for development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }

  // Check against allowed origins
  const allAllowed = [
    ...allowedOrigins.development,
    ...allowedOrigins.production
  ];

  return allAllowed.includes(origin);
};

// CORS configuration object
const corsConfig = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    const msg = `CORS policy: Origin ${origin} is not allowed`;
    console.warn(`🚫 CORS blocked: ${origin}`);
    return callback(new Error(msg), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin'
  ],
  exposedHeaders: ['Authorization']
};

module.exports = {
  allowedOrigins,
  isOriginAllowed,
  corsConfig
};
