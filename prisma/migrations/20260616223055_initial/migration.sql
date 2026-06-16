-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_preset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system_prompt" TEXT NOT NULL,
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "mode" TEXT,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT 'New Chat',
    "endpoint_id" UUID,
    "model" TEXT NOT NULL DEFAULT '',
    "owner_id" UUID NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'chat',
    "system_prompt" TEXT,
    "temperature" DOUBLE PRECISION,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_server" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'streamable-http',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'fact',
    "source" TEXT NOT NULL DEFAULT 'user',
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_endpoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "api_key_encrypted" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT,
    "items" JSONB,
    "note_type" TEXT NOT NULL DEFAULT 'note',
    "color" TEXT,
    "label" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "due_date" TIMESTAMP(3),
    "sort_order" INTEGER,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_task" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT 'Untitled Task',
    "prompt" TEXT,
    "task_type" TEXT NOT NULL DEFAULT 'llm',
    "schedule" TEXT NOT NULL DEFAULT 'daily',
    "scheduled_time" TEXT,
    "cron_expression" TEXT,
    "scheduled_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "next_run" TIMESTAMP(3),
    "last_run" TIMESTAMP(3),
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "session_id" UUID,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_run" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "output" TEXT,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "task_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" UUID NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT 'chat.completed',
    "secret_encrypted" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "last_status_code" INTEGER,
    "last_error" TEXT,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

-- CreateIndex
CREATE INDEX "chat_message_session_id_idx" ON "chat_message"("session_id");

-- CreateIndex
CREATE INDEX "chat_message_session_id_created_at_idx" ON "chat_message"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_preset_owner_id_idx" ON "chat_preset"("owner_id");

-- CreateIndex
CREATE INDEX "chat_session_owner_id_idx" ON "chat_session"("owner_id");

-- CreateIndex
CREATE INDEX "chat_session_owner_id_archived_idx" ON "chat_session"("owner_id", "archived");

-- CreateIndex
CREATE INDEX "mcp_server_owner_id_idx" ON "mcp_server"("owner_id");

-- CreateIndex
CREATE INDEX "memory_owner_id_idx" ON "memory"("owner_id");

-- CreateIndex
CREATE INDEX "model_endpoint_owner_id_idx" ON "model_endpoint"("owner_id");

-- CreateIndex
CREATE INDEX "note_owner_id_idx" ON "note"("owner_id");

-- CreateIndex
CREATE INDEX "scheduled_task_owner_id_idx" ON "scheduled_task"("owner_id");

-- CreateIndex
CREATE INDEX "scheduled_task_status_next_run_idx" ON "scheduled_task"("status", "next_run");

-- CreateIndex
CREATE INDEX "task_run_task_id_idx" ON "task_run"("task_id");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "skill_owner_id_idx" ON "skill"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "webhook_owner_id_idx" ON "webhook"("owner_id");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_preset" ADD CONSTRAINT "chat_preset_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "model_endpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_server" ADD CONSTRAINT "mcp_server_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory" ADD CONSTRAINT "memory_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_endpoint" ADD CONSTRAINT "model_endpoint_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_task" ADD CONSTRAINT "scheduled_task_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_run" ADD CONSTRAINT "task_run_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "scheduled_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pgvector: semantic memory search. The embedding column and IVFFlat cosine
-- index live outside the Prisma schema (Prisma has no native vector type);
-- raw SQL in src/features/memory and src/lib/tools/manage_memory reads/writes it.
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "memory" ADD COLUMN "embedding" vector(1536);

-- CreateIndex
CREATE INDEX "memory_embedding_idx" ON "memory" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
