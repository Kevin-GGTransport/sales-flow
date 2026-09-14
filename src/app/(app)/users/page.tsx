import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/components/users/UsersTable";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";

export default async function UsersPage() {
  const [session, users] = await Promise.all([
    auth(),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, name: true, role: true, isActive: true },
    }),
  ]);
  if (!session?.user?.id || !isAdmin(session)) redirect("/");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">用户管理</h1>
        <CreateUserDialog />
      </div>

      <div className="rounded-lg border">
        <UsersTable users={users} meId={session.user.id} />
      </div>
    </div>
  );
}
