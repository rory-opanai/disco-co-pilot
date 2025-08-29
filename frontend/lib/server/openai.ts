import OpenAI from "openai";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

export const REALTIME_MODEL = process.env.REALTIME_MODEL || process.env.NEXT_PUBLIC_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17";
export const RESPONSES_MODEL = process.env.RESPONSES_MODEL || "gpt-4o-mini";
export const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
