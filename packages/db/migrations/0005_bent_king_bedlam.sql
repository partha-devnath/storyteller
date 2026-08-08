DROP INDEX IF EXISTS "embedding_hnsw_idx";
ALTER TABLE "card_embedding" ALTER COLUMN "embedding" SET DATA TYPE vector(4096);
