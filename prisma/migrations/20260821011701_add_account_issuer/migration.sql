-- better-auth 1.7 identifies an account by the issuer/accountId pair. Add the
-- column nullable and backfill before enforcing the constraint, so databases
-- that already hold a credential account can migrate.

-- AlterTable
ALTER TABLE "account" ADD COLUMN     "issuer" TEXT;

UPDATE "account" SET "issuer" = 'local:credential'
WHERE "provider_id" = 'credential' AND "issuer" IS NULL;

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account"("issuer", "account_id");
