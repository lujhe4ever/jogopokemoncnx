CREATE TABLE "QuestProgress" (
  "id" TEXT NOT NULL,
  "questId" TEXT NOT NULL,
  "definitionVersion" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "progress" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "QuestProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestEventReceipt" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "QuestEventReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestRewardClaim" (
  "id" TEXT NOT NULL,
  "questId" TEXT NOT NULL,
  "definitionVersion" INTEGER NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "QuestRewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestProgress_ownerId_questId_key"
ON "QuestProgress"("ownerId", "questId");
CREATE INDEX "QuestProgress_ownerId_status_idx"
ON "QuestProgress"("ownerId", "status");
CREATE UNIQUE INDEX "QuestEventReceipt_ownerId_eventId_key"
ON "QuestEventReceipt"("ownerId", "eventId");
CREATE INDEX "QuestEventReceipt_ownerId_occurredAt_idx"
ON "QuestEventReceipt"("ownerId", "occurredAt");
CREATE UNIQUE INDEX "QuestRewardClaim_ownerId_questId_definitionVersion_key"
ON "QuestRewardClaim"("ownerId", "questId", "definitionVersion");
CREATE INDEX "QuestRewardClaim_ownerId_idx"
ON "QuestRewardClaim"("ownerId");

ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestEventReceipt" ADD CONSTRAINT "QuestEventReceipt_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestRewardClaim" ADD CONSTRAINT "QuestRewardClaim_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_state_check"
CHECK (
  "definitionVersion" > 0
  AND "status" IN ('active', 'completed', 'claimed')
  AND jsonb_typeof("progress") = 'object'
);
