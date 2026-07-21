-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "id" CHAR(36) NOT NULL,
    "session_id" CHAR(36) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "message_type" VARCHAR(30) NOT NULL DEFAULT 'chat',
    "content" TEXT NOT NULL,
    "metadata" JSON,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_submissions" (
    "id" CHAR(36) NOT NULL,
    "user_id" CHAR(36) NOT NULL,
    "exercise_id" CHAR(36) NOT NULL,
    "code" TEXT NOT NULL,
    "language" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'queued',
    "submission_no" INTEGER NOT NULL,
    "compile_success" BOOLEAN,
    "passed_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "error_type" VARCHAR(30),
    "execution_time_ms" INTEGER,
    "memory_used_kb" INTEGER,
    "test_result" JSON,
    "functional_score" INTEGER NOT NULL DEFAULT 0,
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "hint_deduction" INTEGER NOT NULL DEFAULT 0,
    "final_score" INTEGER NOT NULL DEFAULT 0,
    "ai_review_status" VARCHAR(30),
    "ai_review" JSON,
    "model" VARCHAR(100),
    "rubric_version" VARCHAR(30),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "code_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_chat_messages_session_id_idx" ON "ai_chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "ai_chat_messages_created_at_idx" ON "ai_chat_messages"("created_at");

-- CreateIndex
CREATE INDEX "ai_chat_messages_is_delete_idx" ON "ai_chat_messages"("is_delete");

-- CreateIndex
CREATE INDEX "code_submissions_user_id_idx" ON "code_submissions"("user_id");

-- CreateIndex
CREATE INDEX "code_submissions_exercise_id_idx" ON "code_submissions"("exercise_id");

-- CreateIndex
CREATE INDEX "code_submissions_status_idx" ON "code_submissions"("status");

-- CreateIndex
CREATE INDEX "code_submissions_created_at_idx" ON "code_submissions"("created_at");

-- CreateIndex
CREATE INDEX "code_submissions_is_delete_idx" ON "code_submissions"("is_delete");

-- CreateIndex
CREATE UNIQUE INDEX "code_submissions_user_id_exercise_id_submission_no_key"
ON "code_submissions"("user_id", "exercise_id", "submission_no");

-- AddForeignKey
ALTER TABLE "ai_chat_messages"
ADD CONSTRAINT "ai_chat_messages_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "ai_chat_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_submissions"
ADD CONSTRAINT "code_submissions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_submissions"
ADD CONSTRAINT "code_submissions_exercise_id_fkey"
FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
