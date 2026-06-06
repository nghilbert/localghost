-- CreateTable
CREATE TABLE "email_account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "imapHost" TEXT NOT NULL DEFAULT '',
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapUser" TEXT NOT NULL DEFAULT '',
    "imapPasswordEncrypted" TEXT NOT NULL DEFAULT '',
    "imapStarttls" BOOLEAN NOT NULL DEFAULT true,
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "smtpSecurity" TEXT NOT NULL DEFAULT 'ssl',
    "smtpUser" TEXT NOT NULL DEFAULT '',
    "smtpPasswordEncrypted" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_summary" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'INBOX',
    "subject" TEXT NOT NULL DEFAULT '',
    "fromAddr" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_cal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#5b8abf',
    "source" TEXT NOT NULL DEFAULT 'local',
    "caldavUrl" TEXT,
    "caldavUsernameEncrypted" TEXT,
    "caldavPasswordEncrypted" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_cal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "uid" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "dtstart" TIMESTAMP(3) NOT NULL,
    "dtend" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "rrule" TEXT,
    "color" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_account_ownerId_idx" ON "email_account"("ownerId");
CREATE UNIQUE INDEX "email_summary_accountId_messageId_key" ON "email_summary"("accountId", "messageId");
CREATE INDEX "email_summary_ownerId_idx" ON "email_summary"("ownerId");
CREATE INDEX "calendar_cal_ownerId_idx" ON "calendar_cal"("ownerId");
CREATE INDEX "calendar_event_ownerId_idx" ON "calendar_event"("ownerId");
CREATE INDEX "calendar_event_calendarId_idx" ON "calendar_event"("calendarId");
CREATE INDEX "calendar_event_dtstart_idx" ON "calendar_event"("dtstart");

-- AddForeignKey
ALTER TABLE "email_account" ADD CONSTRAINT "email_account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_summary" ADD CONSTRAINT "email_summary_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_cal" ADD CONSTRAINT "calendar_cal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendar_cal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
