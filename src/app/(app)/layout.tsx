import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  // 折叠状态是设备级偏好：服务端读 cookie 作初始值，刷新不闪
  const defaultCollapsed =
    (await cookies()).get("sidebar-collapsed")?.value === "1";

  return (
    <AppShell
      isAdmin={isAdmin}
      defaultCollapsed={defaultCollapsed}
      name={session.user.name ?? ""}
      role={session.user.role}
    >
      {children}
    </AppShell>
  );
}
