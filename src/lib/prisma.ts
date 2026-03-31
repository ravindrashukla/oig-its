import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pool: pg.Pool;
};

function createPrismaClient() {
  const pool =
    globalForPrisma.pool ??
    new pg.Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://oig:oig_dev_2026@localhost:5432/oig_its",
    });
  if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
