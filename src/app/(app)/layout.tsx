import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { ScrollProvider } from "@/components/layout/scroll-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="h-dvh flex overflow-hidden">
      <Suspense>
        <NavigationProgress />
      </Suspense>
      <AppSidebar />
      <ScrollProvider>
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        </div>
        <MobileNav />
      </ScrollProvider>
    </div>
  );
}
