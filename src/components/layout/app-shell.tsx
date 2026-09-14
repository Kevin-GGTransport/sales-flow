"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  adminNavItem,
  NavLinks,
  navItems,
  Sidebar,
} from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

const SIDEBAR_COOKIE = "sidebar-collapsed";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 应用外壳：桌面侧边栏（可折叠成图标窄轨）+ 小屏抽屉导航。
 * 折叠状态写 cookie、由 (app)/layout.tsx 服务端读取作初始值，刷新不闪。
 */
export function AppShell({
  isAdmin,
  defaultCollapsed,
  name,
  role,
  children,
}: {
  isAdmin: boolean;
  defaultCollapsed: boolean;
  name: string;
  role: "ADMIN" | "STAFF";
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const items = isAdmin ? [...navItems, adminNavItem] : [...navItems];

  // 路由变化即关抽屉（覆盖浏览器前进/后退）：渲染期对比上一跳路径，
  // 不用 effect（避免级联渲染，react-hooks/set-state-in-effect）
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const toggleCollapsed = React.useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  }, [collapsed]);

  return (
    <div className="flex min-h-svh">
      <Sidebar isAdmin={isAdmin} collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={name}
          role={role}
          menuOpen={mobileOpen}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* 小屏抽屉：与桌面侧边栏同款深绿面板 */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-72 gap-0 border-sidebar-border bg-sidebar text-sidebar-foreground"
        >
          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
            <span className="size-2 shrink-0 rounded-[3px] bg-sidebar-primary" />
            <SheetTitle className="font-heading text-base font-semibold tracking-tight">
              sales-flow
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">主导航菜单</SheetDescription>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            <NavLinks
              items={items}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
