const pool = require('../config/database');

const exerciseModel = {
  async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE id_user = $1 ORDER BY muscle_group, name',
      [userId]
    );
    return result.rows;
  },

  async findByMuscleGroup(userId, muscleGroup) {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE id_user = $1 AND muscle_group = $2 ORDER BY name',
      [userId, muscleGroup]
    );
    return result.rows;
  },

  async findById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE id = $1 AND id_user = $2',
      [id, userId]
    );
    return result.rows[0];
  },

  async create(exerciseData) {
    const { id_user, name, description, image_url, has_pulley, is_unilateral, bar_weight, muscle_group } = exerciseData;
    const result = await pool.query(
      'INSERT INTO exercises (id_user, name, description, image_url, has_pulley, is_unilateral, bar_weight, muscle_group) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [id_user, name, description, image_url, has_pulley, is_unilateral, bar_weight, muscle_group]
    );
    return result.rows[0];
  },

  async update(id, userId, exerciseData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(exerciseData).forEach(([key, value]) => {
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
    const query = `UPDATE exercises SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} AND id_user = $${paramCount + 1} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM exercises WHERE id = $1 AND id_user = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0];
  },

  async getMuscleGroups(userId) {
    const result = await pool.query(
      'SELECT DISTINCT muscle_group FROM exercises WHERE id_user = $1 ORDER BY muscle_group',
      [userId]
    );
    return result.rows.map(row => row.muscle_group);
  }
};

module.exports = exerciseModel;
