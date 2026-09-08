import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { homeFor } from "@/lib/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect(homeFor(user.role));
  }
  return <>{children}</>;
}
