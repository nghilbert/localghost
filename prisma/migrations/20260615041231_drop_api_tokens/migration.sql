/*
  Warnings:

  - You are about to drop the `api_token` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "api_token" DROP CONSTRAINT "api_token_owner_id_fkey";

-- DropTable
DROP TABLE "api_token";
