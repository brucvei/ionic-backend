var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

// Import CORS configuration
// const { corsConfig } = require('./config/cors');
// const corsDebugMiddleware = require('./middleware/corsDebug');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var exercisesRouter = require('./routes/exercises');
var workoutsRouter = require('./routes/workouts');
var routinesRouter = require('./routes/routines');
var workoutSessionsRouter = require('./routes/workout-sessions');
var statisticsRouter = require('./routes/statistics');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Configure CORS to allow ALL origins (simplified for debugging)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Remove duplicate middleware
// app.use(corsDebugMiddleware);

// Debug middleware to log ALL requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`, {
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Health check and CORS test endpoints MUST come BEFORE generic routes
app.get('/health', (req, res) => {
  console.log('🏥 Health endpoint accessed:', {
    url: req.url,
    method: req.method,
    origin: req.get('origin'),
    userAgent: req.get('user-agent')
  });

  res.json({
    status: 'OK',
    message: 'Workout API is running',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origin: req.get('origin') || 'no-origin',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      corsTest: '/cors-test',
      apiBase: '/api'
    }
  });
});

app.get('/cors-test', (req, res) => {
  console.log('🌐 CORS test endpoint accessed:', {
    url: req.url,
    method: req.method,
    origin: req.get('origin')
  });

  res.json({
    message: 'CORS is working!',
    origin: req.get('origin'),
    method: req.method,
    headers: {
      'user-agent': req.get('user-agent'),
      'authorization': req.get('authorization') ? 'present' : 'not-present',
      'accept': req.get('accept')
    },
    timestamp: new Date().toISOString(),
    cors_headers: res.getHeaders(),
    url: req.url
  });
});

// Debug endpoint to show all routes
app.get('/debug-routes', (req, res) => {
  res.json({
    message: 'Available routes debug info',
    routes: {
      system: ['/health', '/cors-test', '/debug-routes', '/test'],
      api: ['/api/auth/*', '/api/exercises/*', '/api/workouts/*', '/api/routines/*', '/api/workout-sessions/*', '/api/statistics/*'],
      generic: ['/', '/users/*']
    },
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  console.log('✅ Simple test endpoint accessed:', req.url);
  res.json({
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

// API Routes (specific routes first)
app.use('/api/auth', authRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/routines', routinesRouter);
app.use('/api/workout-sessions', workoutSessionsRouter);
app.use('/api/statistics', statisticsRouter);

// Generic routes LAST (these catch everything else)
app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.log('⚠️  404 - Route not found:', {
    method: req.method,
    url: req.url,
    origin: req.get('origin')
  });

  // For API routes, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      method: req.method,
      path: req.path,
      available_endpoints: {
        health: '/health',
        corsTest: '/cors-test',
        auth: '/api/auth/*',
        exercises: '/api/exercises/*',
        workouts: '/api/workouts/*'
      }
    });
  }

  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' });
  }

  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: 'Only image files are allowed!' });
  }

  // API error responses
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  }

  // render the error page for non-API routes
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
