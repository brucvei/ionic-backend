var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

// Import CORS configuration
const { corsConfig } = require('./config/cors');
const corsDebugMiddleware = require('./middleware/corsDebug');

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

// Configure CORS to allow localhost frontend connections
app.use(cors(corsConfig));

// Preflight OPTIONS handler for CORS
app.options('*', cors(corsConfig));

// CORS debug middleware (helps with troubleshooting)
app.use(corsDebugMiddleware);

app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Health check and CORS test endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origin: req.get('origin') || 'no-origin'
  });
});

app.get('/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.get('origin'),
    method: req.method,
    headers: {
      'user-agent': req.get('user-agent'),
      'authorization': req.get('authorization') ? 'present' : 'not-present'
    },
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/routines', routinesRouter);
app.use('/api/workout-sessions', workoutSessionsRouter);
app.use('/api/statistics', statisticsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
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
