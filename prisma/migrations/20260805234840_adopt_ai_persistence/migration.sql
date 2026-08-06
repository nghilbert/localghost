/*
  Warnings:

  - You are about to drop the column `messages` on the `conversation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "conversation" DROP COLUMN "messages";

-- CreateTable
CREATE TABLE "chat_thread" (
    "thread_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_thread_pkey" PRIMARY KEY ("thread_id")
);

-- CreateTable
CREATE TABLE "chat_run" (
    "run_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" BIGINT NOT NULL,
    "finished_at" BIGINT,
    "error" TEXT,
    "error_code" TEXT,
    "usage" JSONB,
    "sandbox_key" TEXT,
    "detached_since" BIGINT,
    "cancel_requested" BOOLEAN,
    "driver_epoch" INTEGER,

    CONSTRAINT "chat_run_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "chat_interrupt" (
    "interrupt_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requested_at" BIGINT NOT NULL,
    "resolved_at" BIGINT,
    "payload" JSONB NOT NULL,
    "response" JSONB,

    CONSTRAINT "chat_interrupt_pkey" PRIMARY KEY ("interrupt_id")
);

-- CreateIndex
CREATE INDEX "chat_run_thread_id_status_idx" ON "chat_run"("thread_id", "status");

-- CreateIndex
CREATE INDEX "chat_run_thread_id_started_at_idx" ON "chat_run"("thread_id", "started_at");

-- CreateIndex
CREATE INDEX "chat_run_status_detached_since_idx" ON "chat_run"("status", "detached_since");

-- CreateIndex
CREATE INDEX "chat_interrupt_thread_id_requested_at_idx" ON "chat_interrupt"("thread_id", "requested_at");

-- CreateIndex
CREATE INDEX "chat_interrupt_run_id_requested_at_idx" ON "chat_interrupt"("run_id", "requested_at");
