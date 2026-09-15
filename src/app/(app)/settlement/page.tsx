import { UrlTabs } from "@/components/ui/url-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentsPanel } from "@/components/settlement/PaymentsPanel";
import { InvoicesPanel } from "@/components/settlement/InvoicesPanel";

/** 结算中心：销账（应收应付/收付款流水）+ 开票 合并，Tab 由 ?tab= 驱动（默认销账） */
export default async function SettlementPage({
  searchParams,
}: PageProps<"/settlement">) {
  const sp = await searchParams;
  const tab = sp.tab === "invoices" ? "invoices" : "payments";

  return (
    <div className="space-y-4">
      <PageHeader title="结算中心" />

      <UrlTabs
        value={tab}
        tabs={[
          { value: "payments", label: "销账", href: "/settlement?tab=payments" },
          { value: "invoices", label: "开票", href: "/settlement?tab=invoices" },
        ]}
      />

      {tab === "payments" ? <PaymentsPanel /> : <InvoicesPanel />}
    </div>
  );
}
