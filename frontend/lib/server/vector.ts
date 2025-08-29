import { getOpenAI, EMBEDDING_MODEL } from "./openai";
import { query } from "./db";

export async function embed(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts });
  return res.data.map((d) => d.embedding as number[]);
}

export async function searchPlaybooks(queryText: string, topK = 5): Promise<{ id: string; title: string; content: string; score: number }[]> {
  const [qVec] = await embed([queryText]);
  const vecLit = `[${qVec.join(",")}]`;
  const { rows } = await query<{ id: string; title: string; content: string; score: number }>(
    `SELECT id, title, content, 1 - (embedding <=> $1::vector) AS score
     FROM playbooks
     ORDER BY embedding <=> $1::vector ASC
     LIMIT $2`,
    [vecLit, topK]
  );
  return rows;
}
