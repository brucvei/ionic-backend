const express = require('express');
const workoutSessionModel = require('../models/workoutSessionModel');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get workout sessions for user (with pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const sessions = await workoutSessionModel.findByUserId(
      req.user.userId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({ sessions });
  } catch (error) {
    console.error('Get workout sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workout session by ID with exercises and sets
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await workoutSessionModel.findWithExercisesAndSets(req.params.id, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get workout session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start new workout session
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { workout_id, notes } = req.body;

    const sessionData = {
      id_user: req.user.userId,
      id_workout: workout_id,
      notes
    };

    const session = await workoutSessionModel.create(sessionData);

    res.status(201).json({
      message: 'Workout session started successfully',
      session
    });
  } catch (error) {
    console.error('Start workout session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update workout session
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { notes, end_time } = req.body;

    const sessionData = {};
    if (notes !== undefined) sessionData.notes = notes;
    if (end_time !== undefined) sessionData.end_time = end_time;

    const session = await workoutSessionModel.update(req.params.id, req.user.userId, sessionData);

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    res.json({
      message: 'Workout session updated successfully',
      session
    });
  } catch (error) {
    console.error('Update workout session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End workout session (calculates total volume)
router.post('/:id/end', authenticateToken, async (req, res) => {
  try {
    const session = await workoutSessionModel.endSession(req.params.id, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    res.json({
      message: 'Workout session ended successfully',
      session
    });
  } catch (error) {
    console.error('End workout session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add exercise to workout session
router.post('/:id/exercises', authenticateToken, async (req, res) => {
  try {
    const { exercise_id, number, observations } = req.body;

    const sessionExercise = await workoutSessionModel.addExercise(
      req.params.id,
      exercise_id,
      number,
      observations,
      req.user.userId
    );

    res.status(201).json({
      message: 'Exercise added to workout session successfully',
      session_exercise: sessionExercise
    });
  } catch (error) {
    console.error('Add exercise to session error:', error);
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add set to workout session
router.post('/:id/sets', authenticateToken, async (req, res) => {
  try {
    const { exercise_id, number_of_set, sets, series_type, weight, reps } = req.body;

    const setData = {
      id_workout_session: req.params.id,
      id_exercise: exercise_id,
      number_of_set,
      sets,
      series_type: parseInt(series_type) || 0, // 0: aquecimento, 1: preparatória, 2: working set, 3: back off set
      weight: parseInt(weight),
      reps: parseInt(reps)
    };

    const sessionSet = await workoutSessionModel.addSet(setData);

    res.status(201).json({
      message: 'Set added to workout session successfully',
      session_set: sessionSet
    });
  } catch (error) {
    console.error('Add set to session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update set in workout session
router.put('/sets/:setId', authenticateToken, async (req, res) => {
  try {
    const { weight, reps, series_type, done } = req.body;

    const setData = {};
    if (weight !== undefined) setData.weight = parseInt(weight);
    if (reps !== undefined) setData.reps = parseInt(reps);
    if (series_type !== undefined) setData.series_type = parseInt(series_type);
    if (done !== undefined) setData.done = done === true;

    const sessionSet = await workoutSessionModel.updateSet(req.params.setId, setData);

    if (!sessionSet) {
      return res.status(404).json({ error: 'Set not found' });
    }

    res.json({
      message: 'Set updated successfully',
      session_set: sessionSet
    });
  } catch (error) {
    console.error('Update set error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get exercise progress
router.get('/progress/:exerciseId', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const progress = await workoutSessionModel.getProgressByExercise(
      req.user.userId,
      req.params.exerciseId,
      parseInt(limit)
    );

    res.json({ progress });
  } catch (error) {
    console.error('Get exercise progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get calendar data
router.get('/calendar/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const calendarData = await workoutSessionModel.getCalendarData(
      req.user.userId,
      parseInt(year),
      parseInt(month)
    );

    res.json({ calendar_data: calendarData });
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
