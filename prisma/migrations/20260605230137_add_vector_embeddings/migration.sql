-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to memory table (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE "memory" ADD COLUMN "embedding" vector(1536);

-- IVFFlat index for approximate nearest-neighbour search on cosine distance.
-- Built at query time the first time it's used; lists = sqrt(expected row count).
CREATE INDEX "memory_embedding_idx" ON "memory" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
