import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title={tab === "purchases" ? "买入单" : "卖出单"}
        actions={
          <Button asChild>
            <Link href={tab === "purchases" ? "/purchases/new" : "/sales/new"}>
              {tab === "purchases" ? "新建买入单" : "新建卖出单"}
            </Link>
          </Button>
        }
      />

      {tab === "sales" ? <SalesPanel sp={sp} /> : <PurchasesPanel sp={sp} />}
    </div>
  );
}
