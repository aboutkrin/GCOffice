import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // api/webhooks and api/cron authenticate themselves (HMAC / CRON_SECRET);
    // without this exclusion updateSession() redirects them to /login.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|sw\\.js\\.map|swe-worker.*|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
