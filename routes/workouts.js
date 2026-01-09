const express = require('express');
const multer = require('multer');
const path = require('path');
const workoutModel = require('../models/workoutModel');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/workouts/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'workout-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all workouts for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const workouts = await workoutModel.findByUserId(req.user.userId);
    res.json({ workouts });
  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workout by ID with exercises
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const workout = await workoutModel.findWithExercises(req.params.id, req.user.userId);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json({ workout });
  } catch (error) {
    console.error('Get workout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new workout
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;

    const workoutData = {
      id_user: req.user.userId,
      name,
      description,
      image_url: req.file ? `/images/workouts/${req.file.filename}` : null
    };

    const workout = await workoutModel.create(workoutData);

    res.status(201).json({
      message: 'Workout created successfully',
      workout
    });
  } catch (error) {
    console.error('Create workout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update workout
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;

    const workoutData = {};
    if (name) workoutData.name = name;
    if (description !== undefined) workoutData.description = description;
    if (req.file) workoutData.image_url = `/images/workouts/${req.file.filename}`;

    const workout = await workoutModel.update(req.params.id, req.user.userId, workoutData);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json({
      message: 'Workout updated successfully',
      workout
    });
  } catch (error) {
    console.error('Update workout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete workout
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const workout = await workoutModel.delete(req.params.id, req.user.userId);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add exercise to workout
router.post('/:id/exercises', authenticateToken, async (req, res) => {
  try {
    const { exercise_id, sets, number } = req.body;

    const workoutExercise = await workoutModel.addExercise(
      req.params.id,
      exercise_id,
      sets,
      number,
      req.user.userId
    );

    res.status(201).json({
      message: 'Exercise added to workout successfully',
      workout_exercise: workoutExercise
    });
  } catch (error) {
    console.error('Add exercise to workout error:', error);
    if (error.message === 'Workout not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove exercise from workout
router.delete('/:workoutId/exercises/:exerciseId', authenticateToken, async (req, res) => {
  try {
    const result = await workoutModel.removeExercise(
      req.params.workoutId,
      req.params.exerciseId,
      req.user.userId
    );

    if (!result) {
      return res.status(404).json({ error: 'Exercise not found in workout' });
    }

    res.json({ message: 'Exercise removed from workout successfully' });
  } catch (error) {
    console.error('Remove exercise from workout error:', error);
    if (error.message === 'Workout not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update exercise order in workout
router.put('/:workoutId/exercises/:exerciseId/order', authenticateToken, async (req, res) => {
  try {
    const { number } = req.body;

    const workoutExercise = await workoutModel.updateExerciseOrder(
      req.params.workoutId,
      req.params.exerciseId,
      number,
      req.user.userId
    );

    if (!workoutExercise) {
      return res.status(404).json({ error: 'Exercise not found in workout' });
    }

    res.json({
      message: 'Exercise order updated successfully',
      workout_exercise: workoutExercise
    });
  } catch (error) {
    console.error('Update exercise order error:', error);
    if (error.message === 'Workout not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
