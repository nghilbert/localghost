-- CreateTable
CREATE TABLE "scheduled_task" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Task',
    "prompt" TEXT,
    "taskType" TEXT NOT NULL DEFAULT 'llm',
    "schedule" TEXT NOT NULL DEFAULT 'daily',
    "scheduledTime" TEXT,
    "cronExpression" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "nextRun" TIMESTAMP(3),
    "lastRun" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_run" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "output" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "task_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_task_ownerId_idx" ON "scheduled_task"("ownerId");
CREATE INDEX "scheduled_task_status_nextRun_idx" ON "scheduled_task"("status", "nextRun");
CREATE INDEX "task_run_taskId_idx" ON "task_run"("taskId");

-- AddForeignKey
ALTER TABLE "scheduled_task" ADD CONSTRAINT "scheduled_task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_run" ADD CONSTRAINT "task_run_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "scheduled_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
