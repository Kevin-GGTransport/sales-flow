"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  TrendingUp,
  Users,
  Warehouse,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/parts", label: "配件", icon: Package },
  { href: "/inventory", label: "库存", icon: Boxes },
  { href: "/custody", label: "代保管", icon: Warehouse },
  { href: "/purchases", label: "买入单", icon: ShoppingCart },
  { href: "/sales", label: "卖出单", icon: TrendingUp },
  { href: "/payments", label: "销账", icon: Wallet },
  { href: "/invoices", label: "开票", icon: FileText },
  { href: "/reports", label: "统计", icon: BarChart3 },
] as const;

export const adminNavItem = {
  href: "/users",
  label: "用户管理",
  icon: Users,
} as const;

export function NavLinks({
  items,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  items: readonly { href: string; label: string; icon: typeof Package }[];
  pathname: string;
  /** 深绿底（桌面侧边栏与抽屉共用）：选中态用「纸片」 */
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-2 overflow-hidden rounded-lg py-2 text-sm font-medium whitespace-nowrap transition-colors",
              collapsed ? "justify-center px-2" : "px-3",
              active
                ? "bg-background text-foreground shadow-sm dark:bg-sidebar-accent dark:text-sidebar-accent-foreground dark:shadow-none"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {/* 折叠时不渲染文字（opacity-0 仍占宽会把图标挤离中心，实测图标可被裁半） */}
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar({
  isAdmin,
  collapsed,
  onToggle,
}: {
  isAdmin: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const items = isAdmin ? [...navItems, adminNavItem] : [...navItems];

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out md:flex",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "pl-4 pr-2",
        )}
      >
        {/* 折叠按钮＝书脊顶部的「书扣」：展开时收在行尾与 Topbar 登出同线，
            折叠时独占 56px 轨道居中（绿方块与文字隐去，深绿底即品牌） */}
        {!collapsed && (
          <>
            <span className="size-2 shrink-0 rounded-[3px] bg-sidebar-primary" />
            <span className="font-heading text-base font-semibold tracking-tight">
              sales-flow
            </span>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          className={cn(
            "shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "" : "ml-auto",
          )}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLinks items={items} pathname={pathname} collapsed={collapsed} />
      </nav>
    </aside>
  );
}
