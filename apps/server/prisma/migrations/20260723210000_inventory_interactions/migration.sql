CREATE TABLE "InventoryStack" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "accountId" TEXT NOT NULL,
  CONSTRAINT "InventoryStack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InteractionClaim" (
  "id" TEXT NOT NULL,
  "interactionId" TEXT NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountId" TEXT NOT NULL,
  CONSTRAINT "InteractionClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryStack_accountId_itemId_key"
ON "InventoryStack"("accountId", "itemId");
CREATE INDEX "InventoryStack_accountId_idx" ON "InventoryStack"("accountId");
CREATE UNIQUE INDEX "InteractionClaim_accountId_interactionId_key"
ON "InteractionClaim"("accountId", "interactionId");
CREATE INDEX "InteractionClaim_accountId_idx" ON "InteractionClaim"("accountId");

ALTER TABLE "InventoryStack"
ADD CONSTRAINT "InventoryStack_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InteractionClaim"
ADD CONSTRAINT "InteractionClaim_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryStack"
ADD CONSTRAINT "InventoryStack_quantity_check"
CHECK ("quantity" > 0 AND "quantity" <= 99);
