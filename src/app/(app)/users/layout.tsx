import { requireAdmin } from "@/lib/auth";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
