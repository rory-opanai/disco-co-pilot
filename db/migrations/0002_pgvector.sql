-- Enable pgvector and create playbooks table
CREATE EXTENSION IF NOT EXISTS vector;

-- text-embedding-3-small is 1536 dims
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536)
);

CREATE INDEX IF NOT EXISTS playbooks_embedding_idx ON playbooks USING ivfflat (embedding vector_cosine_ops);

