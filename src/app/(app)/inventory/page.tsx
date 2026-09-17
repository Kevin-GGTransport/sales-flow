import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UrlTabs } from "@/components/ui/url-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StockPanel } from "@/components/inventory/StockPanel";

/** 库存：同一套配件/库存数据，按普通与代保管类型分 Tab。 */
export default async function InventoryPage({
  searchParams,
}: PageProps<"/inventory">) {
  const sp = await searchParams;
  const tab = sp.tab === "custody" ? "custody" : "stock";

  return (
    <div className="space-y-4">
      <PageHeader
        title="库存"
        actions={<Button asChild variant="secondary"><Link href="/parts">管理配件</Link></Button>}
      />

      <UrlTabs
        value={tab}
        tabs={[
          { value: "stock", label: "配件库存", href: "/inventory" },
          { value: "custody", label: "代保管", href: "/inventory?tab=custody" },
        ]}
      />

      <StockPanel sp={sp} mode={tab} />
    </div>
  );
}
