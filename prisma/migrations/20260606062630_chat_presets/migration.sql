-- CreateTable
CREATE TABLE "chat_preset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "mode" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_preset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_preset_ownerId_idx" ON "chat_preset"("ownerId");

-- AddForeignKey
ALTER TABLE "chat_preset" ADD CONSTRAINT "chat_preset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
