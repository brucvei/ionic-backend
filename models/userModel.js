const pool = require('../config/database');

const userModel = {
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query('SELECT id, name, email, image_url, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(userData) {
    const { name, email, password_hash, image_url } = userData;
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, image_url) VALUES ($1, $2, $3, $4) RETURNING id, name, email, image_url, created_at',
      [name, email, password_hash, image_url]
    );
    return result.rows[0];
  },

  async update(id, userData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING id, name, email, image_url, created_at`;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  }
};

module.exports = userModel;
