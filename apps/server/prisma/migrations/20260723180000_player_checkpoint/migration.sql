CREATE TABLE "PlayerCheckpoint" (
  "id" TEXT NOT NULL,
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "accountId" TEXT NOT NULL,
  CONSTRAINT "PlayerCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerCheckpoint_accountId_key" ON "PlayerCheckpoint"("accountId");

ALTER TABLE "PlayerCheckpoint" ADD CONSTRAINT "PlayerCheckpoint_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
