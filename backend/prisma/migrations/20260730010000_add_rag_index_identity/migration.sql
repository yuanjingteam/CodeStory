-- Stage 1 RAG index identity. Vectors from different models must never share
-- the same ready generation even when they have the same dimensions.
ALTER TABLE "knowledge_index_state"
  ADD COLUMN "embedding_model" VARCHAR(150),
  ADD COLUMN "embedding_dimensions" INTEGER,
  ADD COLUMN "index_version" VARCHAR(30);

CREATE INDEX "knowledge_index_state_identity_idx"
  ON "knowledge_index_state"(
    "embedding_model",
    "embedding_dimensions",
    "index_version"
  );
