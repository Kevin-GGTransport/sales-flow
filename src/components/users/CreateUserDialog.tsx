"use client";

import { Plus } from "lucide-react";
import { createUser } from "@/actions/users";
import { DialogFormError, useActionDialog } from "@/lib/use-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

/** 新建用户（用户管理页头部入口） */
export function CreateUserDialog() {
  const { open, setOpen, pending, error, run } = useActionDialog();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(() =>
      createUser({
        username: String(fd.get("username") ?? ""),
        name: String(fd.get("name") ?? ""),
        password: String(fd.get("password") ?? ""),
        role: (fd.get("role") as "ADMIN" | "STAFF") ?? "STAFF",
      }),
      "用户已创建",
    );
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
          <DialogFormError msg={error} />
          <Button type="submit" disabled={pending}>
            {pending ? "创建中…" : "创建"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
