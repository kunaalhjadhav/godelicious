-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "botEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "MarketingDraft" (
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

-- CreateTable
CREATE TABLE "BotConversation" (
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

-- CreateTable
CREATE TABLE "BotMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotConversation_channel_contactId_key" ON "BotConversation"("channel", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "BotMessage_externalId_key" ON "BotMessage"("externalId");

-- CreateIndex
CREATE INDEX "BotMessage_conversationId_createdAt_idx" ON "BotMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "BotMessage" ADD CONSTRAINT "BotMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "BotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
