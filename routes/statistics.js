const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Total workouts completed
    const totalWorkoutsResult = await pool.query(`
      SELECT COUNT(*) as total_workouts
      FROM workout_sessions 
      WHERE id_user = $1 AND end_time IS NOT NULL
    `, [userId]);

    // Total volume this week
    const weeklyVolumeResult = await pool.query(`
      SELECT COALESCE(SUM(total_volume), 0) as weekly_volume
      FROM workout_sessions 
      WHERE id_user = $1 
        AND end_time IS NOT NULL
        AND start_time >= DATE_TRUNC('week', CURRENT_DATE)
    `, [userId]);

    // Total volume this month
    const monthlyVolumeResult = await pool.query(`
      SELECT COALESCE(SUM(total_volume), 0) as monthly_volume
      FROM workout_sessions 
      WHERE id_user = $1 
        AND end_time IS NOT NULL
        AND start_time >= DATE_TRUNC('month', CURRENT_DATE)
    `, [userId]);

    // Average workout duration (in minutes)
    const avgDurationResult = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_duration_minutes
      FROM workout_sessions 
      WHERE id_user = $1 AND end_time IS NOT NULL
    `, [userId]);

    // Workouts this week count
    const weeklyWorkoutsResult = await pool.query(`
      SELECT COUNT(*) as weekly_workouts
      FROM workout_sessions 
      WHERE id_user = $1 
        AND end_time IS NOT NULL
        AND start_time >= DATE_TRUNC('week', CURRENT_DATE)
    `, [userId]);

    // Most used exercises (top 5)
    const topExercisesResult = await pool.query(`
      SELECT e.name, e.muscle_group, COUNT(*) as usage_count
      FROM workout_session_exercise wse
      JOIN exercises e ON wse.id_exercise = e.id
      JOIN workout_sessions ws ON wse.id_workout_session = ws.id
      WHERE ws.id_user = $1 AND ws.end_time IS NOT NULL
      GROUP BY e.id, e.name, e.muscle_group
      ORDER BY usage_count DESC
      LIMIT 5
    `, [userId]);

    // Recent workout sessions (last 10)
    const recentSessionsResult = await pool.query(`
      SELECT ws.*, w.name as workout_name
      FROM workout_sessions ws
      JOIN workout w ON ws.id_workout = w.id
      WHERE ws.id_user = $1 AND ws.end_time IS NOT NULL
      ORDER BY ws.start_time DESC
      LIMIT 10
    `, [userId]);

    // Muscle group distribution (current month)
    const muscleGroupStatsResult = await pool.query(`
      SELECT e.muscle_group, COUNT(*) as exercise_count
      FROM workout_session_exercise wse
      JOIN exercises e ON wse.id_exercise = e.id
      JOIN workout_sessions ws ON wse.id_workout_session = ws.id
      WHERE ws.id_user = $1 
        AND ws.end_time IS NOT NULL
        AND ws.start_time >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY e.muscle_group
      ORDER BY exercise_count DESC
    `, [userId]);

    const statistics = {
      total_workouts: parseInt(totalWorkoutsResult.rows[0].total_workouts),
      weekly_volume: parseInt(weeklyVolumeResult.rows[0].weekly_volume),
      monthly_volume: parseInt(monthlyVolumeResult.rows[0].monthly_volume),
      avg_duration_minutes: parseFloat(avgDurationResult.rows[0].avg_duration_minutes) || 0,
      weekly_workouts: parseInt(weeklyWorkoutsResult.rows[0].weekly_workouts),
      top_exercises: topExercisesResult.rows,
      recent_sessions: recentSessionsResult.rows,
      muscle_group_stats: muscleGroupStatsResult.rows
    };

    res.json({ statistics });
  } catch (error) {
    console.error('Get dashboard statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get exercise progress statistics
router.get('/exercise-progress/:exerciseId', authenticateToken, async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { limit = 20 } = req.query;
    const userId = req.user.userId;

    // Get exercise details
    const exerciseResult = await pool.query(`
      SELECT * FROM exercises WHERE id = $1 AND id_user = $2
    `, [exerciseId, userId]);

    if (exerciseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Get progress data (working sets and back off sets only)
    const progressResult = await pool.query(`
      SELECT 
        wss.weight,
        wss.reps,
        wss.series_type,
        ws.start_time::date as workout_date,
        w.name as workout_name
      FROM workout_session_set wss
      JOIN workout_sessions ws ON wss.id_workout_session = ws.id
      JOIN workout w ON ws.id_workout = w.id
      WHERE ws.id_user = $1 
        AND wss.id_exercise = $2 
        AND wss.series_type IN (2, 3)
        AND ws.end_time IS NOT NULL
      ORDER BY ws.start_time DESC
      LIMIT $3
    `, [userId, exerciseId, parseInt(limit)]);

    // Calculate 1RM estimates using Epley formula: 1RM = weight * (1 + reps/30)
    const progressWithOneRM = progressResult.rows.map(set => ({
      ...set,
      estimated_1rm: Math.round(set.weight * (1 + set.reps / 30))
    }));

    // Get best sets (highest weight, most reps, highest 1RM estimate)
    const bestWeight = Math.max(...progressWithOneRM.map(set => set.weight), 0);
    const bestReps = Math.max(...progressWithOneRM.map(set => set.reps), 0);
    const bestOneRM = Math.max(...progressWithOneRM.map(set => set.estimated_1rm), 0);

    // Get total volume for this exercise
    const volumeResult = await pool.query(`
      SELECT SUM(wss.weight * wss.reps) as total_volume
      FROM workout_session_set wss
      JOIN workout_sessions ws ON wss.id_workout_session = ws.id
      WHERE ws.id_user = $1 
        AND wss.id_exercise = $2 
        AND wss.series_type IN (2, 3)
        AND ws.end_time IS NOT NULL
    `, [userId, exerciseId]);

    const progressStats = {
      exercise: exerciseResult.rows[0],
      progress_data: progressWithOneRM,
      best_weight: bestWeight,
      best_reps: bestReps,
      best_estimated_1rm: bestOneRM,
      total_volume: parseInt(volumeResult.rows[0].total_volume) || 0,
      total_sessions: progressWithOneRM.length
    };

    res.json({ progress_stats: progressStats });
  } catch (error) {
    console.error('Get exercise progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly workout summary
router.get('/monthly-summary/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.userId;

    // Validate year and month
    const yearInt = parseInt(year);
    const monthInt = parseInt(month);

    if (isNaN(yearInt) || isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    // Total workouts in month
    const totalWorkoutsResult = await pool.query(`
      SELECT COUNT(*) as total_workouts
      FROM workout_sessions 
      WHERE id_user = $1 
        AND end_time IS NOT NULL
        AND EXTRACT(YEAR FROM start_time) = $2 
        AND EXTRACT(MONTH FROM start_time) = $3
    `, [userId, yearInt, monthInt]);

    // Total volume in month
    const totalVolumeResult = await pool.query(`
      SELECT COALESCE(SUM(total_volume), 0) as total_volume
      FROM workout_sessions 
      WHERE id_user = $1 
        AND end_time IS NOT NULL
        AND EXTRACT(YEAR FROM start_time) = $2 
        AND EXTRACT(MONTH FROM start_time) = $3
    `, [userId, yearInt, monthInt]);

    // Daily breakdown
    const dailyBreakdownResult = await pool.query(`
      SELECT 
        DATE(start_time) as workout_date,
        COUNT(*) as sessions_count,
        SUM(total_volume) as daily_volume,
        AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_duration
      FROM workout_sessions
      WHERE id_user = $1 
        AND end_time IS NOT NULL
        AND EXTRACT(YEAR FROM start_time) = $2 
        AND EXTRACT(MONTH FROM start_time) = $3
      GROUP BY DATE(start_time)
      ORDER BY workout_date
    `, [userId, yearInt, monthInt]);

    const monthlySummary = {
      year: yearInt,
      month: monthInt,
      total_workouts: parseInt(totalWorkoutsResult.rows[0].total_workouts),
      total_volume: parseInt(totalVolumeResult.rows[0].total_volume),
      daily_breakdown: dailyBreakdownResult.rows.map(day => ({
        date: day.workout_date,
        sessions_count: parseInt(day.sessions_count),
        volume: parseInt(day.daily_volume) || 0,
        avg_duration_minutes: parseFloat(day.avg_duration) || 0
      }))
    };

    res.json({ monthly_summary: monthlySummary });
  } catch (error) {
    console.error('Get monthly summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
