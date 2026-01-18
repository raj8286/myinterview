import pg from "pg";
import { ENV } from "./env.js";

const { Pool } = pg;

const isCloudDB = ENV.DB_URL?.includes("neon.tech") || 
                  ENV.DB_URL?.includes("sslmode=require");

export const pool = new Pool({
  connectionString: ENV.DB_URL,
  ssl: isCloudDB ? { rejectUnauthorized: false } : false,
});

export const connectDB = async () => {
  try {
    if (!ENV.DB_URL) {
      throw new Error("DB_URL is not defined in environment variables");
    }
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL");
    client.release();
  } catch (error) {
    console.error("❌ Error connecting to PostgreSQL", error);
    process.exit(1);
  }
};

// Helper for queries
export const query = (text, params) => pool.query(text, params);
