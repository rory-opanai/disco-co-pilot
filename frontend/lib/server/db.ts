import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("DATABASE_URL not set; DB routes will fail until configured.");
}

export const pool = new Pool({ connectionString, ssl: process.env.PGSSL?.toLowerCase() === 'disable' ? false : { rejectUnauthorized: false } });

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return { rows: res.rows };
  } finally {
    client.release();
  }
}

