/*
  Warnings:

  - You are about to drop the `ollama_pull` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ollama_pull" DROP CONSTRAINT "ollama_pull_owner_id_fkey";

-- DropTable
DROP TABLE "ollama_pull";
