import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL;
if (!connectionString) {
  console.warn("DATABASE_URL/POSTGRES_URL not set; DB routes will fail until configured.");
}

function getCaFromEnv(): string | undefined {
  const raw = process.env.DATABASE_CA_CERT || process.env.PGSSL_CA || "";
  if (!raw) return undefined;
  if (raw.includes("-----BEGIN")) return raw; // PEM provided directly
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return undefined;
  }
}

const sslConfig = (() => {
  const pgssl = (process.env.PGSSL || "").toLowerCase();
  if (pgssl === "disable") return false as const;
  const ca = getCaFromEnv();
  if (ca) return { ca, rejectUnauthorized: true } as const;
  // Fallback to permissive mode to avoid self-signed failures
  return { rejectUnauthorized: false } as const;
})();

export const pool = new Pool({ connectionString, ssl: sslConfig });

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return { rows: res.rows };
  } finally {
    client.release();
  }
}
