const express = require('express');
const multer = require('multer');
const path = require('path');
const exerciseModel = require('../models/exerciseModel');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/exercises/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'exercise-' + uniqueSuffix + path.extname(file.originalname))
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

// Get all exercises for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { muscle_group } = req.query;

    let exercises;
    if (muscle_group) {
      exercises = await exerciseModel.findByMuscleGroup(req.user.userId, muscle_group);
    } else {
      exercises = await exerciseModel.findByUserId(req.user.userId);
    }

    res.json({ exercises });
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get exercise by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const exercise = await exerciseModel.findById(req.params.id, req.user.userId);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json({ exercise });
  } catch (error) {
    console.error('Get exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new exercise
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description, has_pulley, is_unilateral, bar_weight, muscle_group } = req.body;

    const exerciseData = {
      id_user: req.user.userId,
      name,
      description,
      has_pulley: has_pulley === 'true',
      is_unilateral: is_unilateral === 'true',
      bar_weight: bar_weight ? parseInt(bar_weight) : null,
      muscle_group,
      image_url: req.file ? `/images/exercises/${req.file.filename}` : null
    };

    const exercise = await exerciseModel.create(exerciseData);

    res.status(201).json({
      message: 'Exercise created successfully',
      exercise
    });
  } catch (error) {
    console.error('Create exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update exercise
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description, has_pulley, is_unilateral, bar_weight, muscle_group } = req.body;

    const exerciseData = {};
    if (name) exerciseData.name = name;
    if (description !== undefined) exerciseData.description = description;
    if (has_pulley !== undefined) exerciseData.has_pulley = has_pulley === 'true';
    if (is_unilateral !== undefined) exerciseData.is_unilateral = is_unilateral === 'true';
    if (bar_weight !== undefined) exerciseData.bar_weight = bar_weight ? parseInt(bar_weight) : null;
    if (muscle_group) exerciseData.muscle_group = muscle_group;
    if (req.file) exerciseData.image_url = `/images/exercises/${req.file.filename}`;

    const exercise = await exerciseModel.update(req.params.id, req.user.userId, exerciseData);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json({
      message: 'Exercise updated successfully',
      exercise
    });
  } catch (error) {
    console.error('Update exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete exercise
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const exercise = await exerciseModel.delete(req.params.id, req.user.userId);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    console.error('Delete exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get muscle groups
router.get('/muscle-groups/list', authenticateToken, async (req, res) => {
  try {
    const muscleGroups = await exerciseModel.getMuscleGroups(req.user.userId);
    res.json({ muscle_groups: muscleGroups });
  } catch (error) {
    console.error('Get muscle groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
