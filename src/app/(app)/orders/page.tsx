import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UrlTabs } from "@/components/ui/url-tabs";
import { SalesPanel } from "@/components/orders/SalesPanel";
import { PurchasesPanel } from "@/components/orders/PurchasesPanel";

/** 单据中心：买入 / 卖出列表合并，Tab 由 ?tab= 驱动（默认卖出，频率更高） */
export default async function OrdersPage({
  searchParams,
}: PageProps<"/orders">) {
  const sp = await searchParams;
  const tab = sp.tab === "purchases" ? "purchases" : "sales";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">单据中心</h1>
        <Button asChild>
          <Link href={tab === "purchases" ? "/purchases/new" : "/sales/new"}>
            {tab === "purchases" ? "新建买入单" : "新建卖出单"}
          </Link>
        </Button>
      </div>

      <UrlTabs
        value={tab}
        tabs={[
          { value: "sales", label: "卖出单", href: "/orders?tab=sales" },
          { value: "purchases", label: "买入单", href: "/orders?tab=purchases" },
        ]}
      />

      {tab === "sales" ? <SalesPanel sp={sp} /> : <PurchasesPanel sp={sp} />}
    </div>
  );
}
