import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    pool: { min: 5, max: 20 },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
