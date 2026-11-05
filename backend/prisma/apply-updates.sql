-- Safe to run more than once. Adds only what is missing; never deletes or changes existing data.

ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "foodCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "MenuItem_foodCode_key" ON "MenuItem"("foodCode");

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "botEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "VenueBooking" ADD COLUMN IF NOT EXISTS "advanceAmount" DOUBLE PRECISION;
ALTER TABLE "VenueBooking" ADD COLUMN IF NOT EXISTS "advancePaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VenueBooking" ADD COLUMN IF NOT EXISTS "advanceRazorpayOrderId" TEXT;
ALTER TABLE "VenueBooking" ADD COLUMN IF NOT EXISTS "advancePaymentId" TEXT;
ALTER TABLE "VenueBooking" ADD COLUMN IF NOT EXISTS "advancePaidAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "MarketingDraft" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'POST',
  "language" TEXT NOT NULL DEFAULT 'en',
  "title" TEXT,
  "body" TEXT NOT NULL,
  "hashtags" TEXT,
  "visualIdea" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "batchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BotConversation" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "contactName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'BOT',
  "needsReason" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BotConversation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BotConversation_channel_contactId_key" ON "BotConversation"("channel", "contactId");

CREATE TABLE IF NOT EXISTS "BotMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BotMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BotMessage_externalId_key" ON "BotMessage"("externalId");
CREATE INDEX IF NOT EXISTS "BotMessage_conversationId_createdAt_idx" ON "BotMessage"("conversationId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "BotMessage" ADD CONSTRAINT "BotMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "BotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "advancePaid" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "minOrderQty" INTEGER NOT NULL DEFAULT 0;
