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

    // Validações
    if (!name || !muscle_group) {
      return res.status(400).json({ error: 'Name and muscle_group are required' });
    }

    if (bar_weight && ![6, 8, 10, 12, 20].includes(parseInt(bar_weight))) {
      return res.status(400).json({ error: 'Bar weight must be 6, 8, 10, 12, or 20 kg' });
    }

    // Validar conflitos de equipamento
    if (has_pulley === 'true' && bar_weight) {
      return res.status(400).json({ error: 'Exercise cannot have both pulley and bar weight' });
    }

    const exerciseData = {
      id_user: req.user.userId,
      name: name.trim(),
      description: description?.trim() || null,
      has_pulley: has_pulley === 'true',
      is_unilateral: is_unilateral === 'true',
      bar_weight: bar_weight ? parseInt(bar_weight) : null,
      muscle_group: muscle_group.trim(),
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

// Calculate actual weight based on equipment configuration
router.post('/:id/calculate-weight', authenticateToken, async (req, res) => {
  try {
    const { input_weight } = req.body;

    if (!input_weight || input_weight <= 0) {
      return res.status(400).json({ error: 'Valid input_weight is required' });
    }

    const exercise = await exerciseModel.findById(req.params.id, req.user.userId);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    let actualWeight = input_weight;

    // Se tem polia, divide por 2
    if (exercise.has_pulley) {
      actualWeight = actualWeight / 2;
    }

    // Se tem barra, multiplica por 2 (peso dos dois lados) e soma peso da barra
    if (exercise.bar_weight) {
      actualWeight = (input_weight * 2) + exercise.bar_weight;
    }

    // Se é unilateral mas o usuário quer saber o bilateral
    let bilateralWeight = actualWeight;
    if (exercise.is_unilateral && !exercise.has_pulley && !exercise.bar_weight) {
      bilateralWeight = actualWeight * 2;
    }

    res.json({
      exercise_name: exercise.name,
      input_weight: input_weight,
      actual_weight: actualWeight,
      bilateral_weight: bilateralWeight,
      calculation_info: {
        has_pulley: exercise.has_pulley,
        is_unilateral: exercise.is_unilateral,
        bar_weight: exercise.bar_weight,
        description: getWeightCalculationDescription(exercise)
      }
    });
  } catch (error) {
    console.error('Calculate weight error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function for weight calculation description
function getWeightCalculationDescription(exercise) {
  const descriptions = [];

  if (exercise.bar_weight) {
    descriptions.push(`Bar weight: ${exercise.bar_weight}kg`);
    descriptions.push('Formula: (input × 2) + bar weight');
  }

  if (exercise.has_pulley) {
    descriptions.push('Has pulley: input ÷ 2');
  }

  if (exercise.is_unilateral) {
    descriptions.push('Unilateral: weight per side');
  } else {
    descriptions.push('Bilateral: total weight');
  }

  return descriptions.join(' | ');
}

// Update exercise equipment configuration (for use during workout)
router.patch('/:id/equipment', authenticateToken, async (req, res) => {
  try {
    const { has_pulley, is_unilateral, bar_weight } = req.body;

    // Validações
    if (bar_weight && ![6, 8, 10, 12, 20].includes(parseInt(bar_weight))) {
      return res.status(400).json({ error: 'Bar weight must be 6, 8, 10, 12, or 20 kg' });
    }

    if (has_pulley && bar_weight) {
      return res.status(400).json({ error: 'Exercise cannot have both pulley and bar weight' });
    }

    const equipmentData = {};
    if (has_pulley !== undefined) equipmentData.has_pulley = has_pulley;
    if (is_unilateral !== undefined) equipmentData.is_unilateral = is_unilateral;
    if (bar_weight !== undefined) equipmentData.bar_weight = bar_weight ? parseInt(bar_weight) : null;

    const exercise = await exerciseModel.update(req.params.id, req.user.userId, equipmentData);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json({
      message: 'Exercise equipment configuration updated successfully',
      exercise,
      calculation_info: getWeightCalculationDescription(exercise)
    });
  } catch (error) {
    console.error('Update exercise equipment error:', error);
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
