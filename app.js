const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const exercisesRouter = require('./routes/exercises');
const workoutsRouter = require('./routes/workouts');
const routinesRouter = require('./routes/routines');
const workoutSessionsRouter = require('./routes/workout-sessions');
const statisticsRouter = require('./routes/statistics');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

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

app.use('/auth', authRouter);
app.use('/exercises', exercisesRouter);
app.use('/workouts', workoutsRouter);
app.use('/routines', routinesRouter);
app.use('/workout-sessions', workoutSessionsRouter);
app.use('/statistics', statisticsRouter);

app.use('/', indexRouter);

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
