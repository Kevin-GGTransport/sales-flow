"use client";

import { useMemo, useState } from "react";
import { Power } from "lucide-react";
import {
  setUserActive,
  setUserRole,
} from "@/actions/users";
import { useActionRun } from "@/lib/use-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import {
  ResetPasswordDialog,
  ResetPasswordTrigger,
} from "@/components/users/ResetPasswordDialog";

export type UserRow = {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
};

/** 用户列表：角色/启停为整表共享动作，重置密码为单例弹窗 */
export function UsersTable({ users, meId }: { users: UserRow[]; meId: string }) {
  const { pending, run } = useActionRun();
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);

  const columns = useMemo<DataTableColumn<UserRow>[]>(
    () => [
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
            <ResetPasswordTrigger username={u.username} onClick={() => setResetTarget(u)} />
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
    ],
    [meId, pending, run],
  );

  return (
    <>
      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        empty="还没有用户"
        rowClassName={(u) => (u.isActive ? "" : "opacity-50")}
      />
      {resetTarget && (
        <ResetPasswordDialog
          key={resetTarget.id}
          userId={resetTarget.id}
          username={resetTarget.username}
          open
          onOpenChange={(o) => !o && setResetTarget(null)}
        />
      )}
    </>
  );
}
