import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UrlTabs } from "@/components/ui/url-tabs";
import { StockPanel } from "@/components/inventory/StockPanel";
import { CustodyPanel } from "@/components/custody/CustodyPanel";
import { NewCustodyItemDialog } from "@/components/custody/dialogs/NewCustodyItemDialog";

/** 库存：配件库存（自营 + 寄卖）/ 代保管 合并，Tab 由 ?tab= 驱动（默认配件库存） */
export default async function InventoryPage({
  searchParams,
}: PageProps<"/inventory">) {
  const sp = await searchParams;
  const tab = sp.tab === "custody" ? "custody" : "stock";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">库存</h1>
        {tab === "custody" ? (
          <NewCustodyItemDialog />
        ) : (
          <Button asChild variant="secondary">
            <Link href="/parts">管理配件</Link>
          </Button>
        )}
      </div>

      <UrlTabs
        value={tab}
        tabs={[
          { value: "stock", label: "配件库存", href: "/inventory" },
          { value: "custody", label: "代保管", href: "/inventory?tab=custody" },
        ]}
      />

      {tab === "custody" ? <CustodyPanel sp={sp} /> : <StockPanel sp={sp} />}
    </div>
  );
}
