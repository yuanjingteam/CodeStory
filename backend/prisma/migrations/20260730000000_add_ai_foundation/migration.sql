-- Stage 0B AI foundation.
-- text-embedding-v4 uses 1024 dimensions by default. Changing
-- AI_EMBEDDING_DIMENSIONS requires a new migration and a full index rebuild.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "ai_chat_sessions"
  ADD COLUMN "current_run_id" CHAR(36),
  ADD COLUMN "state_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "graph_version" VARCHAR(30);

CREATE TABLE "knowledge_chunks" (
  "id" CHAR(36) NOT NULL,
  "source_type" VARCHAR(20) NOT NULL,
  "source_id" CHAR(36) NOT NULL,
  "course_id" CHAR(36),
  "lesson_id" CHAR(36),
  "source_version" TIMESTAMP(6) NOT NULL,
  "chunk_index" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "embedding" vector(1024) NOT NULL,
  "metadata" JSON,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  "is_delete" SMALLINT NOT NULL DEFAULT 0,

  CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_index_state" (
  "id" CHAR(36) NOT NULL,
  "source_type" VARCHAR(20) NOT NULL,
  "source_id" CHAR(36) NOT NULL,
  "source_updated_at" TIMESTAMP(6) NOT NULL,
  "index_generation" BIGINT NOT NULL DEFAULT 0,
  "indexed_at" TIMESTAMP(6),
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "error_code" VARCHAR(100),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "knowledge_index_state_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_run_effects" (
  "id" CHAR(36) NOT NULL,
  "run_id" CHAR(36) NOT NULL,
  "node_name" VARCHAR(80) NOT NULL,
  "effect_type" VARCHAR(80) NOT NULL,
  "effect_key" VARCHAR(255) NOT NULL,
  "payload" JSON,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "error_code" VARCHAR(100),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "applied_at" TIMESTAMP(6),

  CONSTRAINT "learning_run_effects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_chunks_source_type_source_id_chunk_index_key"
  ON "knowledge_chunks"("source_type", "source_id", "chunk_index");
CREATE INDEX "knowledge_chunks_scope_idx"
  ON "knowledge_chunks"("course_id", "lesson_id", "source_type", "source_id");
CREATE INDEX "knowledge_chunks_source_idx"
  ON "knowledge_chunks"("source_type", "source_id");
CREATE INDEX "knowledge_chunks_is_delete_idx"
  ON "knowledge_chunks"("is_delete");
CREATE INDEX "knowledge_chunks_embedding_hnsw_idx"
  ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);

CREATE UNIQUE INDEX "knowledge_index_state_source_type_source_id_key"
  ON "knowledge_index_state"("source_type", "source_id");
CREATE INDEX "knowledge_index_state_status_indexed_at_idx"
  ON "knowledge_index_state"("status", "indexed_at");

CREATE UNIQUE INDEX "learning_run_effects_effect_key_key"
  ON "learning_run_effects"("effect_key");
CREATE INDEX "learning_run_effects_run_id_idx"
  ON "learning_run_effects"("run_id");
CREATE INDEX "learning_run_effects_status_created_at_idx"
  ON "learning_run_effects"("status", "created_at");
