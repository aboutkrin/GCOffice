import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Get a direct (non-pooling) database URL for Prisma CLI operations like migrations.
 * If POSTGRES_URL_NON_POOLING is set, use it directly.
 * Otherwise, auto-convert a Supabase pooler URL to a direct URL.
 */
function getDirectUrl(): string | undefined {
  const nonPooling = process.env["POSTGRES_URL_NON_POOLING"];
  if (nonPooling) return nonPooling;

  const url = process.env["POSTGRES_URL"] ?? process.env["DATABASE_URL"];
  if (!url) return undefined;

  try {
    const parsed = new URL(url);

    // Detect Supabase pooler URLs (e.g. aws-1-region.pooler.supabase.co)
    // and convert to direct connection (e.g. db.PROJECT_REF.supabase.co)
    if (parsed.hostname.includes(".pooler.supabase.")) {
      const userParts = parsed.username.split(".");
      if (userParts.length >= 2) {
        const projectRef = userParts.slice(1).join(".");
        parsed.hostname = `db.${projectRef}.supabase.co`;
        parsed.username = userParts[0]; // "postgres"
        parsed.port = "5432";
        parsed.searchParams.delete("pgbouncer");
        return parsed.toString();
      }
    }
  } catch {
    // URL parsing failed, use as-is
  }

  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDirectUrl(),
  },
});
