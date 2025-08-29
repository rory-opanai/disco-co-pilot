import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const dir = path.join(__dirname, "playbooks");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const f of files) {
    const fp = path.join(dir, f);
    const title = f.replace(/\.md$/, "");
    const content = readFileSync(fp, "utf8");
    const emb = await openai.embeddings.create({ model: process.env.EMBEDDING_MODEL || "text-embedding-3-small", input: content });
    const vec = emb.data[0].embedding as number[];
    const vecLit = `[${vec.join(",")}]`;
    await query(`INSERT INTO playbooks(title, content, embedding) VALUES($1, $2, $3::vector)`, [title, content, vecLit]);
    console.log(`Seeded ${title}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL?.toLowerCase() === 'disable' ? false : { rejectUnauthorized: false } });
async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await pool.connect();
  try { const res = await client.query(text, params); return { rows: res.rows }; } finally { client.release(); }
}
