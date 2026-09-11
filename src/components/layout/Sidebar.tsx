"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Warehouse,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function NavLinks({
  items,
  pathname,
  onDark,
}: {
  items: readonly { href: string; label: string; icon: typeof Package }[];
  pathname: string;
  /** 深绿侧边栏上：选中态用「纸片」；浅色横栏上：选中态用主绿 */
  onDark?: boolean;
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
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? onDark
                  ? "bg-background text-foreground shadow-sm dark:bg-sidebar-accent dark:text-sidebar-accent-foreground dark:shadow-none"
                  : "bg-primary text-primary-foreground"
                : onDark
                  ? "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...navItems, adminNavItem] : [...navItems];

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="size-2 rounded-[3px] bg-sidebar-primary" />
        <span className="font-heading text-base font-semibold tracking-tight">
          sales-flow
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLinks items={items} pathname={pathname} onDark />
      </nav>
    </aside>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...navItems, adminNavItem] : [...navItems];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b p-2 md:hidden">
      <NavLinks items={items} pathname={pathname} />
    </nav>
  );
}
