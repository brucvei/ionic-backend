const pool = require('../config/database');

const workoutModel = {
  async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM workout WHERE id_user = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async findById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM workout WHERE id = $1 AND id_user = $2',
      [id, userId]
    );
    return result.rows[0];
  },

  async findWithExercises(id, userId) {
    const workout = await this.findById(id, userId);
    if (!workout) return null;

    const exercisesResult = await pool.query(`
      SELECT we.*, e.name, e.description, e.muscle_group, e.has_pulley, e.is_unilateral, e.bar_weight, e.image_url
      FROM workout_exercises we
      JOIN exercises e ON we.id_exercise = e.id
      WHERE we.id_workout = $1
      ORDER BY we.number
    `, [id]);

    workout.exercises = exercisesResult.rows;
    return workout;
  },

  async create(workoutData) {
    const { id_user, name, description, image_url } = workoutData;
    const result = await pool.query(
      'INSERT INTO workout (id_user, name, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_user, name, description, image_url]
    );
    return result.rows[0];
  },

  async update(id, userId, workoutData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(workoutData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'id_user') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id, userId);
    const query = `UPDATE workout SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} AND id_user = $${paramCount + 1} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM workout WHERE id = $1 AND id_user = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0];
  },

  async addExercise(workoutId, exerciseId, sets, number, userId) {
    // Verificar se o workout pertence ao usuário
    const workout = await this.findById(workoutId, userId);
    if (!workout) throw new Error('Workout not found');

    const result = await pool.query(
      'INSERT INTO workout_exercises (id_workout, id_exercise, sets, number) VALUES ($1, $2, $3, $4) RETURNING *',
      [workoutId, exerciseId, sets, number]
    );
    return result.rows[0];
  },

  async removeExercise(workoutId, exerciseId, userId) {
    // Verificar se o workout pertence ao usuário
    const workout = await this.findById(workoutId, userId);
    if (!workout) throw new Error('Workout not found');

    const result = await pool.query(
      'DELETE FROM workout_exercises WHERE id_workout = $1 AND id_exercise = $2 RETURNING id',
      [workoutId, exerciseId]
    );
    return result.rows[0];
  },

  async updateExerciseOrder(workoutId, exerciseId, newNumber, userId) {
    // Verificar se o workout pertence ao usuário
    const workout = await this.findById(workoutId, userId);
    if (!workout) throw new Error('Workout not found');

    const result = await pool.query(
      'UPDATE workout_exercises SET number = $3 WHERE id_workout = $1 AND id_exercise = $2 RETURNING *',
      [workoutId, exerciseId, newNumber]
    );
    return result.rows[0];
  }
};

module.exports = workoutModel;
