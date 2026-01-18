import { query } from "../lib/db.js";

const User = {
  async create({ name, email, profileImage = "", clerkId }) {
    const result = await query(
      `INSERT INTO users (name, email, profile_image, clerk_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, profileImage, clerkId]
    );
    return mapUser(result.rows[0]);
  },

  async findOne({ clerkId }) {
    const result = await query(
      `SELECT * FROM users WHERE clerk_id = $1`,
      [clerkId]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  },

  async findById(id) {
    const result = await query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  },

  async deleteOne({ clerkId }) {
    await query(`DELETE FROM users WHERE clerk_id = $1`, [clerkId]);
  },
};

// Map snake_case DB columns to camelCase
function mapUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    profileImage: row.profile_image,
    clerkId: row.clerk_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default User;
