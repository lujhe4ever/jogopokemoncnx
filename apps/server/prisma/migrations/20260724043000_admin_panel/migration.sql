CREATE TYPE "AdminRole" AS ENUM ('SUPPORT', 'CONTENT_EDITOR', 'OWNER');

ALTER TABLE "Account" ADD COLUMN "adminRole" "AdminRole";

CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "targetType" TEXT,
    "targetRef" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentRelease" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publisherId" TEXT NOT NULL,
    CONSTRAINT "ContentRelease_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAudit_actorId_createdAt_idx" ON "AdminAudit"("actorId", "createdAt");
CREATE INDEX "AdminAudit_action_createdAt_idx" ON "AdminAudit"("action", "createdAt");
CREATE UNIQUE INDEX "ContentRelease_packId_version_key" ON "ContentRelease"("packId", "version");
CREATE INDEX "ContentRelease_publishedAt_idx" ON "ContentRelease"("publishedAt");

ALTER TABLE "AdminAudit" ADD CONSTRAINT "AdminAudit_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentRelease" ADD CONSTRAINT "ContentRelease_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
