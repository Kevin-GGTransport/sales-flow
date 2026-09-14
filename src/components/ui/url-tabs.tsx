import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * URL 驱动的 Tab 导航：选中态来自 searchParam，切 Tab = 路由跳转（可分享、后退友好）。
 * 内容由页面按 tab 分支渲染，不用 TabsContent。
 */
export function UrlTabs({
  value,
  tabs,
}: {
  value: string;
  tabs: { value: string; label: string; href: string }[];
}) {
  return (
    <Tabs value={value}>
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} asChild>
            <Link href={t.href}>{t.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
