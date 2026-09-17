"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MAIN_NAV, SETTINGS_GROUP, filterNav, homeFor, isNavGroup } from "@/lib/nav";
import { NavGroup } from "@/components/layout/nav-group";

interface AppSidebarProps {
  role: string;
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const mainNavEntries = filterNav(MAIN_NAV, role);
  const settingsGroup = filterNav([SETTINGS_GROUP], role).find(isNavGroup);

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-6">
        <Link href={homeFor(role)} className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">GCOffice</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 p-4">
        {mainNavEntries.map((entry) => {
          if (isNavGroup(entry)) {
            return <NavGroup key={entry.label} group={entry} pathname={pathname} />;
          }

          const isActive =
            pathname === entry.href || pathname.startsWith(entry.href + "/");
          const Icon = entry.icon;

          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="size-4" />
              {entry.label}
            </Link>
          );
        })}

        {settingsGroup && <NavGroup group={settingsGroup} pathname={pathname} />}
      </nav>
    </aside>
  );
}
