-- CreateTable
CREATE TABLE "users" (
    "id" CHAR(36) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" SMALLINT NOT NULL DEFAULT 0,
    "password" VARCHAR(255) NOT NULL,
    "nickname" VARCHAR(50),
    "avatar" VARCHAR(500),
    "sex" SMALLINT,
    "occupation" VARCHAR(100),
    "score" BIGINT NOT NULL DEFAULT 0,
    "level" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" CHAR(36) NOT NULL,
    "cover_url" VARCHAR(500),
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "level" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses_progress" (
    "id" CHAR(36) NOT NULL,
    "user_id" CHAR(36) NOT NULL,
    "course_id" CHAR(36) NOT NULL,
    "completed_lessons" INTEGER NOT NULL DEFAULT 0,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 0,
    "last_learned_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "courses_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" CHAR(36) NOT NULL,
    "course_id" CHAR(36) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" CHAR(36) NOT NULL,
    "chapter_id" CHAR(36) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "difficulty" SMALLINT NOT NULL DEFAULT 0,
    "score_avg" INTEGER NOT NULL DEFAULT 0,
    "estimated_time" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons_progress" (
    "id" CHAR(36) NOT NULL,
    "user_id" CHAR(36) NOT NULL,
    "lesson_id" CHAR(36) NOT NULL,
    "status" SMALLINT NOT NULL DEFAULT 0,
    "mastery_level" INTEGER NOT NULL DEFAULT 0,
    "last_learned_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "lessons_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" CHAR(36) NOT NULL,
    "lesson_id" CHAR(36) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "knowledge" TEXT,
    "content" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "analysis" TEXT,
    "difficulty" SMALLINT NOT NULL DEFAULT 1,
    "source" VARCHAR(20),
    "metadata" JSON,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer" (
    "id" CHAR(36) NOT NULL,
    "user_id" CHAR(36) NOT NULL,
    "exercise_id" CHAR(36) NOT NULL,
    "answer" TEXT,
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "hint_level_used" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_sessions" (
    "id" CHAR(36) NOT NULL,
    "user_id" CHAR(36) NOT NULL,
    "lesson_id" CHAR(36) NOT NULL,
    "state" SMALLINT NOT NULL DEFAULT 0,
    "current_exercise_id" CHAR(36),
    "hint_level" INTEGER NOT NULL DEFAULT 0,
    "context" JSON,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wechat_users" (
    "id" CHAR(36) NOT NULL,
    "user_id" CHAR(36),
    "openid" VARCHAR(100) NOT NULL,
    "unionid" VARCHAR(100),
    "nickname" VARCHAR(100),
    "avatar" VARCHAR(500),
    "gender" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "is_delete" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "wechat_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_delete_idx" ON "users"("is_delete");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "courses_level_idx" ON "courses"("level");

-- CreateIndex
CREATE INDEX "courses_is_delete_idx" ON "courses"("is_delete");

-- CreateIndex
CREATE INDEX "courses_created_at_idx" ON "courses"("created_at");

-- CreateIndex
CREATE INDEX "courses_progress_user_id_idx" ON "courses_progress"("user_id");

-- CreateIndex
CREATE INDEX "courses_progress_course_id_idx" ON "courses_progress"("course_id");

-- CreateIndex
CREATE INDEX "courses_progress_status_idx" ON "courses_progress"("status");

-- CreateIndex
CREATE INDEX "courses_progress_is_delete_idx" ON "courses_progress"("is_delete");

-- CreateIndex
CREATE UNIQUE INDEX "courses_progress_user_id_course_id_key" ON "courses_progress"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "chapters_course_id_idx" ON "chapters"("course_id");

-- CreateIndex
CREATE INDEX "chapters_is_delete_idx" ON "chapters"("is_delete");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_course_id_order_key" ON "chapters"("course_id", "order");

-- CreateIndex
CREATE INDEX "lessons_chapter_id_idx" ON "lessons"("chapter_id");

-- CreateIndex
CREATE INDEX "lessons_difficulty_idx" ON "lessons"("difficulty");

-- CreateIndex
CREATE INDEX "lessons_is_delete_idx" ON "lessons"("is_delete");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_chapter_id_order_key" ON "lessons"("chapter_id", "order");

-- CreateIndex
CREATE INDEX "lessons_progress_user_id_idx" ON "lessons_progress"("user_id");

-- CreateIndex
CREATE INDEX "lessons_progress_lesson_id_idx" ON "lessons_progress"("lesson_id");

-- CreateIndex
CREATE INDEX "lessons_progress_status_idx" ON "lessons_progress"("status");

-- CreateIndex
CREATE INDEX "lessons_progress_is_delete_idx" ON "lessons_progress"("is_delete");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_progress_user_id_lesson_id_key" ON "lessons_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "exercises_lesson_id_idx" ON "exercises"("lesson_id");

-- CreateIndex
CREATE INDEX "exercises_type_idx" ON "exercises"("type");

-- CreateIndex
CREATE INDEX "exercises_difficulty_idx" ON "exercises"("difficulty");

-- CreateIndex
CREATE INDEX "exercises_source_idx" ON "exercises"("source");

-- CreateIndex
CREATE INDEX "exercises_is_delete_idx" ON "exercises"("is_delete");

-- CreateIndex
CREATE INDEX "answer_user_id_idx" ON "answer"("user_id");

-- CreateIndex
CREATE INDEX "answer_exercise_id_idx" ON "answer"("exercise_id");

-- CreateIndex
CREATE INDEX "answer_is_delete_idx" ON "answer"("is_delete");

-- CreateIndex
CREATE UNIQUE INDEX "answer_user_id_exercise_id_key" ON "answer"("user_id", "exercise_id");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_user_id_idx" ON "ai_chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_lesson_id_idx" ON "ai_chat_sessions"("lesson_id");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_state_idx" ON "ai_chat_sessions"("state");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_is_delete_idx" ON "ai_chat_sessions"("is_delete");

-- CreateIndex
CREATE UNIQUE INDEX "ai_chat_sessions_user_id_lesson_id_key" ON "ai_chat_sessions"("user_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "wechat_users_openid_key" ON "wechat_users"("openid");

-- CreateIndex
CREATE INDEX "wechat_users_user_id_idx" ON "wechat_users"("user_id");

-- CreateIndex
CREATE INDEX "wechat_users_unionid_idx" ON "wechat_users"("unionid");

-- CreateIndex
CREATE INDEX "wechat_users_is_delete_idx" ON "wechat_users"("is_delete");

-- AddForeignKey
ALTER TABLE "courses_progress" ADD CONSTRAINT "courses_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_progress" ADD CONSTRAINT "courses_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons_progress" ADD CONSTRAINT "lessons_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons_progress" ADD CONSTRAINT "lessons_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wechat_users" ADD CONSTRAINT "wechat_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
