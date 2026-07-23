CREATE TABLE "PvpBattleRecord" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "seed" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "outcome" TEXT,
  "finishReason" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "firstPlayerId" TEXT NOT NULL,
  "secondPlayerId" TEXT NOT NULL,
  "winnerId" TEXT,
  CONSTRAINT "PvpBattleRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PvpBattleRecord_firstPlayerId_idx"
ON "PvpBattleRecord"("firstPlayerId");
CREATE INDEX "PvpBattleRecord_secondPlayerId_idx"
ON "PvpBattleRecord"("secondPlayerId");
CREATE INDEX "PvpBattleRecord_roomId_status_idx"
ON "PvpBattleRecord"("roomId", "status");

ALTER TABLE "PvpBattleRecord" ADD CONSTRAINT "PvpBattleRecord_firstPlayerId_fkey"
FOREIGN KEY ("firstPlayerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PvpBattleRecord" ADD CONSTRAINT "PvpBattleRecord_secondPlayerId_fkey"
FOREIGN KEY ("secondPlayerId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PvpBattleRecord" ADD CONSTRAINT "PvpBattleRecord_winnerId_fkey"
FOREIGN KEY ("winnerId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PvpBattleRecord" ADD CONSTRAINT "PvpBattleRecord_state_check"
CHECK (
  "firstPlayerId" <> "secondPlayerId"
  AND "status" IN ('active', 'finished')
  AND ("outcome" IS NULL OR "outcome" IN ('win', 'draw', 'abandoned'))
  AND ("finishReason" IS NULL OR "finishReason" IN (
    'health', 'turn_limit', 'timeout', 'abandon', 'disconnect'
  ))
);
