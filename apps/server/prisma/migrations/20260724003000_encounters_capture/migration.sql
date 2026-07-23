CREATE TABLE "EncounterRecord" (
  "id" TEXT NOT NULL,
  "zoneId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "definitionVersion" INTEGER NOT NULL,
  "catalogVersion" INTEGER NOT NULL,
  "seed" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'battling',
  "captureRequestId" TEXT,
  "captureSucceeded" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "ownerId" TEXT NOT NULL,
  "battleId" TEXT NOT NULL,
  "capturedCreatureId" TEXT,
  CONSTRAINT "EncounterRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EncounterRecord_battleId_key"
ON "EncounterRecord"("battleId");
CREATE UNIQUE INDEX "EncounterRecord_capturedCreatureId_key"
ON "EncounterRecord"("capturedCreatureId");
CREATE UNIQUE INDEX "EncounterRecord_ownerId_captureRequestId_key"
ON "EncounterRecord"("ownerId", "captureRequestId");
CREATE INDEX "EncounterRecord_ownerId_status_idx"
ON "EncounterRecord"("ownerId", "status");

ALTER TABLE "EncounterRecord"
ADD CONSTRAINT "EncounterRecord_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncounterRecord"
ADD CONSTRAINT "EncounterRecord_battleId_fkey"
FOREIGN KEY ("battleId") REFERENCES "BattleRecord"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncounterRecord"
ADD CONSTRAINT "EncounterRecord_capturedCreatureId_fkey"
FOREIGN KEY ("capturedCreatureId") REFERENCES "Creature"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EncounterRecord"
ADD CONSTRAINT "EncounterRecord_state_check"
CHECK (
  "definitionVersion" > 0
  AND "catalogVersion" > 0
  AND "status" IN ('battling', 'captured', 'escaped')
  AND (
    ("status" = 'battling' AND "completedAt" IS NULL AND "captureSucceeded" IS NULL)
    OR
    (
      "status" IN ('captured', 'escaped')
      AND "completedAt" IS NOT NULL
      AND "captureSucceeded" IS NOT NULL
    )
  )
);
