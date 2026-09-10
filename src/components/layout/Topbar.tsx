"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Topbar({
  name,
  role,
}: {
  name: string;
  role: "ADMIN" | "STAFF";
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b px-4">
      <span className="text-sm text-muted-foreground">{name}</span>
      <Badge variant={role === "ADMIN" ? "default" : "secondary"}>
        {role === "ADMIN" ? "管理员" : "员工"}
      </Badge>
      <form action={logoutAction}>
        <Button variant="ghost" size="sm" type="submit">
          <LogOut className="size-4" />
          登出
        </Button>
      </form>
    </header>
  );
}
