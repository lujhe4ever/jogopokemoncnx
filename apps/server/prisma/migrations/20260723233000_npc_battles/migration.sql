CREATE TABLE "BattleRecord" (
  "id" TEXT NOT NULL,
  "seed" INTEGER NOT NULL,
  "outcome" TEXT,
  "winner" TEXT,
  "experienceReward" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "BattleRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BattleRecord_ownerId_idx" ON "BattleRecord"("ownerId");

ALTER TABLE "BattleRecord"
ADD CONSTRAINT "BattleRecord_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleRecord"
ADD CONSTRAINT "BattleRecord_result_check"
CHECK (
  ("finishedAt" IS NULL AND "outcome" IS NULL AND "winner" IS NULL)
  OR
  (
    "finishedAt" IS NOT NULL
    AND "outcome" IN ('player_win', 'npc_win', 'draw', 'abandoned')
    AND ("winner" IS NULL OR "winner" IN ('player', 'npc'))
    AND "experienceReward" BETWEEN 0 AND 100000
  )
);
