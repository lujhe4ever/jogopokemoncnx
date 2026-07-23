CREATE TABLE "Creature" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "definitionVersion" INTEGER NOT NULL,
  "catalogVersion" INTEGER NOT NULL,
  "experience" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "teamSlot" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "Creature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatureProgressionEvent" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerId" TEXT NOT NULL,
  "creatureId" TEXT NOT NULL,
  CONSTRAINT "CreatureProgressionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Creature_ownerId_teamSlot_key"
ON "Creature"("ownerId", "teamSlot");
CREATE INDEX "Creature_ownerId_idx" ON "Creature"("ownerId");
CREATE UNIQUE INDEX "CreatureProgressionEvent_ownerId_requestId_key"
ON "CreatureProgressionEvent"("ownerId", "requestId");
CREATE INDEX "CreatureProgressionEvent_creatureId_idx"
ON "CreatureProgressionEvent"("creatureId");

ALTER TABLE "Creature"
ADD CONSTRAINT "Creature_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatureProgressionEvent"
ADD CONSTRAINT "CreatureProgressionEvent_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatureProgressionEvent"
ADD CONSTRAINT "CreatureProgressionEvent_creatureId_fkey"
FOREIGN KEY ("creatureId") REFERENCES "Creature"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Creature"
ADD CONSTRAINT "Creature_progression_check"
CHECK (
  "definitionVersion" > 0
  AND "catalogVersion" > 0
  AND "experience" >= 0
  AND "level" BETWEEN 1 AND 50
  AND ("teamSlot" IS NULL OR "teamSlot" BETWEEN 1 AND 6)
);

ALTER TABLE "CreatureProgressionEvent"
ADD CONSTRAINT "CreatureProgressionEvent_amount_check"
CHECK ("amount" > 0 AND "amount" <= 100000);
