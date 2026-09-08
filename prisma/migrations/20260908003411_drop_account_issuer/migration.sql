/*
  Warnings:

  - You are about to drop the column `issuer` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `approved_commands` on the `code_agent_session` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "account_issuer_accountId_uidx";

-- AlterTable
ALTER TABLE "account" DROP COLUMN "issuer";

-- AlterTable
ALTER TABLE "code_agent_session" DROP COLUMN "approved_commands";
