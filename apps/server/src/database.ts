import { PrismaClient } from "@prisma/client";

export interface DatabaseProbe {
  isReady(): Promise<boolean>;
  close(): Promise<void>;
}

export function createDatabaseProbe(
  prisma = new PrismaClient(),
): DatabaseProbe {
  return {
    async isReady() {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },
    async close() {
      await prisma.$disconnect();
    },
  };
}
