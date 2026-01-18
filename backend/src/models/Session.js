import { query } from "../lib/db.js";

const Session = {
  async create({ problem, difficulty, host, callId = "" }) {
    const result = await query(
      `INSERT INTO sessions (problem, difficulty, host_id, call_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [problem, difficulty, host, callId]
    );
    return mapSession(result.rows[0]);
  },

  async findById(id) {
    const result = await query(`SELECT * FROM sessions WHERE id = $1`, [id]);
    return result.rows[0] ? mapSession(result.rows[0]) : null;
  },

  async findByIdWithPopulate(id) {
    const result = await query(
      `SELECT 
        s.*,
        h.id as host_db_id, h.name as host_name, h.email as host_email, 
        h.profile_image as host_profile_image, h.clerk_id as host_clerk_id,
        p.id as participant_db_id, p.name as participant_name, p.email as participant_email,
        p.profile_image as participant_profile_image, p.clerk_id as participant_clerk_id
       FROM sessions s
       LEFT JOIN users h ON s.host_id = h.id
       LEFT JOIN users p ON s.participant_id = p.id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] ? mapSessionWithPopulate(result.rows[0]) : null;
  },

  async findActive() {
    const result = await query(
      `SELECT 
        s.*,
        h.id as host_db_id, h.name as host_name, h.email as host_email,
        h.profile_image as host_profile_image, h.clerk_id as host_clerk_id,
        p.id as participant_db_id, p.name as participant_name, p.email as participant_email,
        p.profile_image as participant_profile_image, p.clerk_id as participant_clerk_id
       FROM sessions s
       LEFT JOIN users h ON s.host_id = h.id
       LEFT JOIN users p ON s.participant_id = p.id
       WHERE s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 20`
    );
    return result.rows.map(mapSessionWithPopulate);
  },

  async findUserRecentSessions(userId) {
    const result = await query(
      `SELECT * FROM sessions 
       WHERE status = 'completed' AND (host_id = $1 OR participant_id = $1)
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );
    return result.rows.map(mapSession);
  },

  async updateParticipant(id, participantId) {
    const result = await query(
      `UPDATE sessions SET participant_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [participantId, id]
    );
    return mapSession(result.rows[0]);
  },

  async updateStatus(id, status) {
    const result = await query(
      `UPDATE sessions SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return mapSession(result.rows[0]);
  },
};

function mapSession(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    problem: row.problem,
    difficulty: row.difficulty,
    host: row.host_id,
    participant: row.participant_id,
    status: row.status,
    callId: row.call_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSessionWithPopulate(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    problem: row.problem,
    difficulty: row.difficulty,
    host: row.host_db_id ? {
      _id: row.host_db_id,
      name: row.host_name,
      email: row.host_email,
      profileImage: row.host_profile_image,
      clerkId: row.host_clerk_id,
    } : null,
    participant: row.participant_db_id ? {
      _id: row.participant_db_id,
      name: row.participant_name,
      email: row.participant_email,
      profileImage: row.participant_profile_image,
      clerkId: row.participant_clerk_id,
    } : null,
    status: row.status,
    callId: row.call_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default Session;
