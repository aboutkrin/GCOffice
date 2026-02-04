import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

// Use pooled URL for serverless (Supabase Supavisor handles pooling)
const rawConnectionString =
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL!;

const isSupabase = rawConnectionString?.includes("supabase.co");

// For Supabase, replace sslmode=require with sslmode=no-verify to skip certificate verification
const connectionString = isSupabase
  ? rawConnectionString?.replace(/sslmode=require/, "sslmode=no-verify")
  : rawConnectionString;

const pool =
  globalForPrisma.pool ??
  new pg.Pool({
    connectionString,
    // Keep pool small for serverless - Supabase Supavisor handles connection pooling
    max: 1,
  });

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
