// Single Prisma client instance (avoids exhausting connections during
// `next dev` hot-reload). Import `db` everywhere instead of `new PrismaClient()`.
import { join } from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Resolve the SQLite path to an ABSOLUTE url at runtime. DATABASE_URL in .env
// is "file:./dev.db" (relative), which the Prisma CLI resolves against the
// schema dir (prisma/) but `next dev` resolves against cwd — so DB routes
// 500 with "Unable to open the database file". Pinning to <cwd>/prisma/dev.db
// makes next dev, tsx scripts, and next start all open the same file. Keep the
// relative DATABASE_URL in .env so the Prisma CLI (db push/studio) still works.
const dbUrl = `file:${join(process.cwd(), "prisma", "dev.db")}`;

export const db =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: dbUrl });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
