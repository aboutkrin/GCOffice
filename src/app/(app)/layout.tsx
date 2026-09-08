import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
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
  const user = await requireUser();

  return (
    <div className="h-dvh flex overflow-hidden pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] md:pt-0">
      <Suspense>
        <NavigationProgress />
      </Suspense>
      <AppSidebar role={user.role} />
      <ScrollProvider>
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={user} role={user.role} />
          <main className="flex-1 overflow-y-auto overscroll-none p-4 md:p-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">{children}</main>
        </div>
        <MobileNav />
      </ScrollProvider>
    </div>
  );
}
