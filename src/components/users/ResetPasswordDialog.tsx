"use client";

import { KeyRound } from "lucide-react";
import { resetUserPassword } from "@/actions/users";
import { DialogFormError, useActionDialog } from "@/lib/use-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 重置某用户密码，受控单例（由 UsersTable 持有 target 行） */
export function ResetPasswordDialog({
  userId,
  username,
  open,
  onOpenChange,
}: {
  userId: string;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, error, run } = useActionDialog({ open, onOpenChange });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(
      () => resetUserPassword(userId, String(fd.get("password") ?? "")),
      `已重置 ${username} 的密码`,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <DialogFormError msg={error} />
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

/** 行内触发按钮（打开单例弹窗） */
export function ResetPasswordTrigger({
  username,
  onClick,
}: {
  username: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="icon" aria-label={`重置 ${username} 的密码`} onClick={onClick}>
      <KeyRound className="size-4" />
    </Button>
  );
}
