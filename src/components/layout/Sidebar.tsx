"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ChevronDown,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Icon = typeof Package;

/**
 * 子项高亮判定收 (pathname, ?tab=)：合并中心靠 tab 区分子项，
 * 旧前缀（详情/新建页仍住 /sales、/purchases… 下）也点亮对应子项。
 */
export type NavChild = {
  label: string;
  href: string;
  isActive: (pathname: string, tab: string | undefined) => boolean;
};

export type NavSection = {
  key: string;
  label: string;
  icon: Icon;
  children: readonly NavChild[];
};

const navSections: readonly NavSection[] = [
  {
    key: "stock",
    label: "库存",
    icon: Boxes,
    children: [
      { label: "配件", href: "/parts", isActive: (p) => p.startsWith("/parts") },
      { label: "库存", href: "/inventory", isActive: (p) => p.startsWith("/inventory") || p.startsWith("/custody") },
    ],
  },
  {
    key: "orders",
    label: "单据",
    icon: ArrowLeftRight,
    children: [
      {
        label: "卖出单",
        href: "/orders?tab=sales",
        isActive: (p, t) =>
          (p === "/orders" && (t ?? "sales") === "sales") || p.startsWith("/sales"),
      },
      {
        label: "买入单",
        href: "/orders?tab=purchases",
        isActive: (p, t) =>
          (p === "/orders" && t === "purchases") || p.startsWith("/purchases"),
      },
    ],
  },
  {
    key: "settlement",
    label: "结算",
    icon: ReceiptText,
    children: [
      {
        label: "销账",
        href: "/settlement?tab=payments",
        isActive: (p, t) =>
          (p === "/settlement" && (t ?? "payments") === "payments") ||
          p.startsWith("/payments"),
      },
      {
        label: "开票",
        href: "/settlement?tab=invoices",
        isActive: (p, t) =>
          (p === "/settlement" && t === "invoices") || p.startsWith("/invoices"),
      },
    ],
  },
];

/** 当前路由落在哪个组（进入该组页面时自动展开该组） */
export function activeSectionKey(
  pathname: string,
  tab: string | undefined,
): string | undefined {
  return navSections.find((s) =>
    s.children.some((c) => c.isActive(pathname, tab)),
  )?.key;
}

const itemBase =
  "flex w-full items-center gap-2 overflow-hidden rounded-lg text-sm font-medium whitespace-nowrap transition-colors";
const itemPaper =
  "bg-background text-foreground shadow-sm dark:bg-sidebar-accent dark:text-sidebar-accent-foreground dark:shadow-none";
const itemDim =
  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed = false,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        itemBase,
        "py-2",
        collapsed ? "justify-center px-2" : "px-3",
        active ? itemPaper : itemDim,
      )}
    >
      <Icon className="size-4 shrink-0" />
      {/* 折叠时不渲染文字（opacity-0 仍占宽会把图标挤离中心，实测图标可被裁半） */}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

/**
 * 导航主体（桌面侧边栏与抽屉共用）：仪表盘 + 三个可展开组 + 统计/用户管理普通项。
 * 展开状态由 AppShell 持有（两处共享）；折叠窄轨下组不可展开、直达组内第一项。
 */
export function NavGroupsView({
  isAdmin,
  pathname,
  tab,
  openSections,
  onToggleSection,
  collapsed = false,
  onNavigate,
}: {
  isAdmin: boolean;
  pathname: string;
  tab: string | undefined;
  openSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
  /** 深绿底（桌面侧边栏与抽屉共用）：选中态用「纸片」 */
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <NavLink
        href="/"
        label="仪表盘"
        icon={LayoutDashboard}
        active={pathname === "/"}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      {navSections.map((section) => {
        const sectionActive = section.children.some((c) =>
          c.isActive(pathname, tab),
        );
        const open = !!openSections[section.key];
        return collapsed ? (
          <NavLink
            key={section.key}
            href={section.children[0].href}
            label={section.label}
            icon={section.icon}
            active={sectionActive}
            collapsed
            onNavigate={onNavigate}
          />
        ) : (
          <div key={section.key}>
            <button
              type="button"
              onClick={() => onToggleSection(section.key)}
              aria-expanded={open}
              className={cn(
                itemBase,
                "py-2 px-3",
                sectionActive
                  ? "text-sidebar-accent-foreground"
                  : itemDim,
              )}
            >
              <section.icon className="size-4 shrink-0" />
              <span>{section.label}</span>
              <ChevronDown
                className={cn(
                  "ms-auto size-4 shrink-0 text-sidebar-foreground/50 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
            {open && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {section.children.map((child) => {
                  const active = child.isActive(pathname, tab);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center rounded-lg py-1.5 pr-3 pl-9 text-sm transition-colors",
                        active ? itemPaper : itemDim,
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <NavLink
        href="/reports"
        label="统计"
        icon={BarChart3}
        active={pathname.startsWith("/reports")}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      {isAdmin && (
        <NavLink
          href="/users"
          label="用户管理"
          icon={Users}
          active={pathname.startsWith("/users")}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}

export function Sidebar({
  isAdmin,
  collapsed,
  onToggle,
  pathname,
  tab,
  openSections,
  onToggleSection,
}: {
  isAdmin: boolean;
  collapsed: boolean;
  onToggle: () => void;
  pathname: string;
  tab: string | undefined;
  openSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
}) {
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
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <NavGroupsView
          isAdmin={isAdmin}
          pathname={pathname}
          tab={tab}
          openSections={openSections}
          onToggleSection={onToggleSection}
          collapsed={collapsed}
        />
      </nav>
    </aside>
  );
}
