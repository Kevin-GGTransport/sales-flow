import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileNav, Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="flex min-h-svh">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={session.user.name ?? ""} role={session.user.role} />
        <MobileNav isAdmin={isAdmin} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
