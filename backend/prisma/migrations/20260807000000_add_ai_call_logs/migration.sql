CREATE TABLE "ai_call_logs" (
    "id" CHAR(36) NOT NULL,
    "trace_id" VARCHAR(128) NOT NULL,
    "scene" VARCHAR(40) NOT NULL,
    "node" VARCHAR(80),
    "model" VARCHAR(150) NOT NULL,
    "prompt_version" VARCHAR(50),
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,
    "estimated_cost_usd" DECIMAL(12,6),
    "duration_ms" INTEGER NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "fallback_used" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL,
    "error_code" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_call_logs_status_check" CHECK ("status" IN ('success', 'error'))
);

CREATE INDEX "ai_call_logs_trace_id_idx" ON "ai_call_logs"("trace_id");
CREATE INDEX "ai_call_logs_scene_status_created_at_idx" ON "ai_call_logs"("scene", "status", "created_at");
CREATE INDEX "ai_call_logs_created_at_idx" ON "ai_call_logs"("created_at");
