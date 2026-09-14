import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!session?.user?.id) redirect("/login");

  // 折叠状态是设备级偏好：服务端读 cookie 作初始值，刷新不闪
  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "1";

  return (
    <AppShell
      isAdmin={isAdmin(session)}
      defaultCollapsed={defaultCollapsed}
      name={session.user.name ?? ""}
      role={session.user.role}
    >
      {children}
    </AppShell>
  );
}
