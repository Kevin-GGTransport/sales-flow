"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Plus, Power } from "lucide-react";
import {
  createUser,
  resetUserPassword,
  setUserActive,
  setUserRole,
} from "@/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";

export type UserRow = {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
};

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const result = await createUser({
      username: String(fd.get("username") ?? ""),
      name: String(fd.get("name") ?? ""),
      password: String(fd.get("password") ?? ""),
      role: (fd.get("role") as "ADMIN" | "STAFF") ?? "STAFF",
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("用户已创建");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          新建用户
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
          <DialogDescription>创建员工或管理员账号。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="u-username">用户名（登录用，3-32 位）*</Label>
            <Input id="u-username" name="username" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="u-name">显示名 *</Label>
            <Input id="u-name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="u-password">初始密码（≥6 位）*</Label>
            <Input id="u-password" name="password" type="password" required />
          </div>
          <div className="grid gap-2">
            <Label>角色</Label>
            <Select name="role" defaultValue="STAFF">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">员工（录单/收款/开票）</SelectItem>
                <SelectItem value="ADMIN">管理员（全部权限）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "创建中…" : "创建"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ userId, username }: { userId: string; username: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const result = await resetUserPassword(userId, String(fd.get("password") ?? ""));
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`已重置 ${username} 的密码`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`重置 ${username} 的密码`}>
          <KeyRound className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>重置 {username} 的密码</DialogTitle>
          <DialogDescription>设置后旧密码立即失效。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="new-password">新密码（≥6 位）*</Label>
            <Input id="new-password" name="password" type="password" required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "保存中…" : "确认重置"}
          </Button>
        </form>
        <DialogFooter className="sr-only">
          <Button type="button" variant="outline">取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersTable({ users, meId }: { users: UserRow[]; meId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    const result = await fn();
    if (!result.ok) {
      toast.error(result.error ?? "操作失败");
      return;
    }
    startTransition(() => router.refresh());
  }

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "username",
      header: "用户名",
      sortValue: (u) => u.username,
      cell: (u) => (
        <>
          <span className="font-medium">{u.username}</span>
          {u.id === meId && <span className="ml-2 text-xs text-muted-foreground">（我）</span>}
        </>
      ),
    },
    { key: "name", header: "显示名", sortValue: (u) => u.name, cell: (u) => u.name },
    {
      key: "role",
      header: "角色",
      sortValue: (u) => (u.role === "ADMIN" ? "管理员" : "员工"),
      cell: (u) => (
        <Select
          value={u.role}
          onValueChange={(v) => run(() => setUserRole(u.id, v as "ADMIN" | "STAFF"))}
          disabled={pending || u.id === meId}
        >
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">管理员</SelectItem>
            <SelectItem value="STAFF">员工</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "status",
      header: "状态",
      card: "badge",
      sortValue: (u) => (u.isActive ? "在用" : "已停用"),
      cell: (u) =>
        u.isActive ? <Badge>在用</Badge> : <Badge variant="destructive">已停用</Badge>,
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      className: "w-0",
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <ResetPasswordDialog userId={u.id} username={u.username} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={u.isActive ? "停用" : "启用"}
            onClick={() => run(() => setUserActive(u.id, !u.isActive))}
            disabled={pending || (u.id === meId && u.isActive)}
          >
            <Power className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">用户管理</h1>
        <CreateUserDialog />
      </div>

      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          empty="还没有用户"
          rowClassName={(u) => (u.isActive ? "" : "opacity-50")}
        />
      </div>
    </div>
  );
}
