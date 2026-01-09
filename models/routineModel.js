const pool = require('../config/database');

const routineModel = {
  async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM routine WHERE id_user = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async findById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM routine WHERE id = $1 AND id_user = $2',
      [id, userId]
    );
    return result.rows[0];
  },

  async findWithWorkouts(id, userId) {
    const routine = await this.findById(id, userId);
    if (!routine) return null;

    const workoutsResult = await pool.query(`
      SELECT wr.*, w.name, w.description, w.image_url
      FROM workout_routines wr
      JOIN workout w ON wr.id_workout = w.id
      WHERE wr.id_routine = $1
      ORDER BY wr.number
    `, [id]);

    routine.workouts = workoutsResult.rows;
    return routine;
  },

  async create(routineData) {
    const { id_user, name, description, image_url } = routineData;
    const result = await pool.query(
      'INSERT INTO routine (id_user, name, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_user, name, description, image_url]
    );
    return result.rows[0];
  },

  async update(id, userId, routineData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(routineData).forEach(([key, value]) => {
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
    const query = `UPDATE routine SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} AND id_user = $${paramCount + 1} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM routine WHERE id = $1 AND id_user = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0];
  },

  async addWorkout(routineId, workoutId, number, userId) {
    // Verificar se a routine pertence ao usuário
    const routine = await this.findById(routineId, userId);
    if (!routine) throw new Error('Routine not found');

    const result = await pool.query(
      'INSERT INTO workout_routines (id_routine, id_workout, number) VALUES ($1, $2, $3) RETURNING *',
      [routineId, workoutId, number]
    );
    return result.rows[0];
  },

  async removeWorkout(routineId, workoutId, userId) {
    // Verificar se a routine pertence ao usuário
    const routine = await this.findById(routineId, userId);
    if (!routine) throw new Error('Routine not found');

    const result = await pool.query(
      'DELETE FROM workout_routines WHERE id_routine = $1 AND id_workout = $2 RETURNING id',
      [routineId, workoutId]
    );
    return result.rows[0];
  },

  async updateWorkoutOrder(routineId, workoutId, newNumber, userId) {
    // Verificar se a routine pertence ao usuário
    const routine = await this.findById(routineId, userId);
    if (!routine) throw new Error('Routine not found');

    const result = await pool.query(
      'UPDATE workout_routines SET number = $3 WHERE id_routine = $1 AND id_workout = $2 RETURNING *',
      [routineId, workoutId, newNumber]
    );
    return result.rows[0];
  }
};

module.exports = routineModel;
