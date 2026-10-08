// Runs `prisma migrate deploy` before `next build`.
// Vercel Preview builds may have no database env vars; there the migration is
// skipped (with a warning) so the preview still builds. Production and local
// builds still fail when no database URL is configured.
import { execSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const hasDbUrl = [
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_URL",
  "POSTGRES_HOST",
].some((key) => process.env[key]);

if (!hasDbUrl && process.env.VERCEL_ENV === "preview") {
  console.warn(
    "⚠ No database URL in this Preview environment — skipping `prisma migrate deploy`."
  );
  process.exit(0);
}

execSync("prisma migrate deploy", { stdio: "inherit" });
