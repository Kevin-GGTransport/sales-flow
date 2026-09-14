"use client";

import { LogOut, Menu } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Topbar({
  name,
  role,
  menuOpen,
  onMenuClick,
}: {
  name: string;
  role: "ADMIN" | "STAFF";
  menuOpen: boolean;
  onMenuClick: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <Button
        variant="ghost"
        size="icon-lg"
        className="-ml-2 md:hidden"
        onClick={onMenuClick}
        aria-label="打开导航菜单"
        aria-expanded={menuOpen}
      >
        <Menu className="size-5" />
      </Button>
      {/* ml-auto：汉堡隐藏时右组仍贴右（justify-end 单子元素会贴左的坑） */}
      <div className="ml-auto flex items-center gap-3">
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
      </div>
    </header>
  );
}
