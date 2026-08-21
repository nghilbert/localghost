-- CreateTable
CREATE TABLE "code_agent_session" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "workspace_path" TEXT NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "harness" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "approved_commands" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_agent_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "code_agent_session_owner_id_idx" ON "code_agent_session"("owner_id");

-- AddForeignKey
ALTER TABLE "code_agent_session" ADD CONSTRAINT "code_agent_session_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_agent_session" ADD CONSTRAINT "code_agent_session_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
