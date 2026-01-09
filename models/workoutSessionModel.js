const pool = require('../config/database');

const workoutSessionModel = {
  async findByUserId(userId, limit = 20, offset = 0) {
    const result = await pool.query(`
      SELECT ws.*, w.name as workout_name, w.description as workout_description
      FROM workout_sessions ws
      JOIN workout w ON ws.id_workout = w.id
      WHERE ws.id_user = $1
      ORDER BY ws.start_time DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    return result.rows;
  },

  async findById(id, userId) {
    const result = await pool.query(`
      SELECT ws.*, w.name as workout_name, w.description as workout_description
      FROM workout_sessions ws
      JOIN workout w ON ws.id_workout = w.id
      WHERE ws.id = $1 AND ws.id_user = $2
    `, [id, userId]);
    return result.rows[0];
  },

  async findWithExercisesAndSets(id, userId) {
    const session = await this.findById(id, userId);
    if (!session) return null;

    // Buscar exercícios da sessão
    const exercisesResult = await pool.query(`
      SELECT wse.*, e.name, e.description, e.muscle_group, e.has_pulley, e.is_unilateral, e.bar_weight
      FROM workout_session_exercise wse
      JOIN exercises e ON wse.id_exercise = e.id
      WHERE wse.id_workout_session = $1
      ORDER BY wse.number
    `, [id]);

    // Buscar sets da sessão
    const setsResult = await pool.query(`
      SELECT * FROM workout_session_set
      WHERE id_workout_session = $1
      ORDER BY id_exercise, number_of_set
    `, [id]);

    session.exercises = exercisesResult.rows;
    session.sets = setsResult.rows;
    return session;
  },

  async create(sessionData) {
    const { id_user, id_workout, notes } = sessionData;
    const result = await pool.query(
      'INSERT INTO workout_sessions (id_user, id_workout, notes) VALUES ($1, $2, $3) RETURNING *',
      [id_user, id_workout, notes]
    );
    return result.rows[0];
  },

  async update(id, userId, sessionData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(sessionData).forEach(([key, value]) => {
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
    const query = `UPDATE workout_sessions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} AND id_user = $${paramCount + 1} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async endSession(id, userId) {
    // Calcular volume total das working sets e back off sets
    const volumeResult = await pool.query(`
      SELECT SUM(weight * reps) as total_volume
      FROM workout_session_set
      WHERE id_workout_session = $1 AND series_type IN (2, 3)
    `, [id]);

    const totalVolume = volumeResult.rows[0].total_volume || 0;

    const result = await pool.query(`
      UPDATE workout_sessions 
      SET end_time = CURRENT_TIMESTAMP, total_volume = $3, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND id_user = $2 
      RETURNING *
    `, [id, userId, totalVolume]);

    return result.rows[0];
  },

  async addExercise(sessionId, exerciseId, number, observations, userId) {
    // Verificar se a sessão pertence ao usuário
    const session = await this.findById(sessionId, userId);
    if (!session) throw new Error('Session not found');

    const result = await pool.query(
      'INSERT INTO workout_session_exercise (id_workout_session, id_exercise, number, observations) VALUES ($1, $2, $3, $4) RETURNING *',
      [sessionId, exerciseId, number, observations]
    );
    return result.rows[0];
  },

  async addSet(setData) {
    const { id_workout_session, id_exercise, number_of_set, sets, series_type, weight, reps } = setData;
    const result = await pool.query(
      'INSERT INTO workout_session_set (id_workout_session, id_exercise, number_of_set, sets, series_type, weight, reps) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id_workout_session, id_exercise, number_of_set, sets, series_type, weight, reps]
    );
    return result.rows[0];
  },

  async updateSet(setId, setData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(setData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(setId);
    const query = `UPDATE workout_session_set SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getProgressByExercise(userId, exerciseId, limit = 10) {
    const result = await pool.query(`
      SELECT wss.*, ws.start_time
      FROM workout_session_set wss
      JOIN workout_sessions ws ON wss.id_workout_session = ws.id
      WHERE ws.id_user = $1 AND wss.id_exercise = $2 AND wss.series_type IN (2, 3)
      ORDER BY ws.start_time DESC
      LIMIT $3
    `, [userId, exerciseId, limit]);
    return result.rows;
  },

  async getCalendarData(userId, year, month) {
    const result = await pool.query(`
      SELECT DATE(start_time) as workout_date, COUNT(*) as sessions_count
      FROM workout_sessions
      WHERE id_user = $1 
        AND EXTRACT(YEAR FROM start_time) = $2 
        AND EXTRACT(MONTH FROM start_time) = $3
        AND end_time IS NOT NULL
      GROUP BY DATE(start_time)
      ORDER BY workout_date
    `, [userId, year, month]);
    return result.rows;
  }
};

module.exports = workoutSessionModel;
