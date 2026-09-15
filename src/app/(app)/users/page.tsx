import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/components/users/UsersTable";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { TablePanel } from "@/components/ui/table-panel";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader title="用户管理" actions={<CreateUserDialog />} />

      <TablePanel>
        <UsersTable users={users} meId={session.user.id} />
      </TablePanel>
    </div>
  );
}
