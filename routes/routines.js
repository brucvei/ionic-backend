const express = require('express');
const multer = require('multer');
const path = require('path');
const routineModel = require('../models/routineModel');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/routines/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'routine-' + uniqueSuffix + path.extname(file.originalname))
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

// Get all routines for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const routines = await routineModel.findByUserId(req.user.userId);
    res.json({ routines });
  } catch (error) {
    console.error('Get routines error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get routine by ID with workouts
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const routine = await routineModel.findWithWorkouts(req.params.id, req.user.userId);

    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    res.json({ routine });
  } catch (error) {
    console.error('Get routine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new routine
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validações
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Routine name is required' });
    }

    // Verificar limite de rotinas por usuário (máximo 3 conforme requisito)
    const existingRoutines = await routineModel.findByUserId(req.user.userId);
    if (existingRoutines.length >= 3) {
      return res.status(400).json({
        error: 'Maximum of 3 routines allowed per user. Delete an existing routine first.'
      });
    }

    const routineData = {
      id_user: req.user.userId,
      name: name.trim(),
      description: description?.trim() || null,
      image_url: req.file ? `/images/routines/${req.file.filename}` : null
    };

    const routine = await routineModel.create(routineData);

    res.status(201).json({
      message: 'Routine created successfully',
      routine
    });
  } catch (error) {
    console.error('Create routine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update routine
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;

    const routineData = {};
    if (name) routineData.name = name;
    if (description !== undefined) routineData.description = description;
    if (req.file) routineData.image_url = `/images/routines/${req.file.filename}`;

    const routine = await routineModel.update(req.params.id, req.user.userId, routineData);

    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    res.json({
      message: 'Routine updated successfully',
      routine
    });
  } catch (error) {
    console.error('Update routine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete routine
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const routine = await routineModel.delete(req.params.id, req.user.userId);

    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    res.json({ message: 'Routine deleted successfully' });
  } catch (error) {
    console.error('Delete routine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add workout to routine
router.post('/:id/workouts', authenticateToken, async (req, res) => {
  try {
    const { workout_id, number } = req.body;

    // Validações
    if (!workout_id || !number) {
      return res.status(400).json({ error: 'workout_id and number are required' });
    }

    // Verificar limite de workouts por rotina (máximo 6 conforme requisito)
    const routine = await routineModel.findWithWorkouts(req.params.id, req.user.userId);
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    if (routine.workouts && routine.workouts.length >= 6) {
      return res.status(400).json({
        error: 'Maximum of 6 workouts allowed per routine'
      });
    }

    const routineWorkout = await routineModel.addWorkout(
      req.params.id,
      workout_id,
      number,
      req.user.userId
    );

    res.status(201).json({
      message: 'Workout added to routine successfully',
      routine_workout: routineWorkout
    });
  } catch (error) {
    console.error('Add workout to routine error:', error);
    if (error.message === 'Routine not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove workout from routine
router.delete('/:routineId/workouts/:workoutId', authenticateToken, async (req, res) => {
  try {
    const result = await routineModel.removeWorkout(
      req.params.routineId,
      req.params.workoutId,
      req.user.userId
    );

    if (!result) {
      return res.status(404).json({ error: 'Workout not found in routine' });
    }

    res.json({ message: 'Workout removed from routine successfully' });
  } catch (error) {
    console.error('Remove workout from routine error:', error);
    if (error.message === 'Routine not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update workout order in routine
router.put('/:routineId/workouts/:workoutId/order', authenticateToken, async (req, res) => {
  try {
    const { number } = req.body;

    const routineWorkout = await routineModel.updateWorkoutOrder(
      req.params.routineId,
      req.params.workoutId,
      number,
      req.user.userId
    );

    if (!routineWorkout) {
      return res.status(404).json({ error: 'Workout not found in routine' });
    }

    res.json({
      message: 'Workout order updated successfully',
      routine_workout: routineWorkout
    });
  } catch (error) {
    console.error('Update workout order error:', error);
    if (error.message === 'Routine not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
