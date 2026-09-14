import { redirect } from "next/navigation";

/** 旧 /purchases 列表已并入单据中心（307 透传 query，收藏夹不断链） */
export default async function PurchasesPage({
  searchParams,
}: PageProps<"/purchases">) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "purchases" });
  for (const [k, v] of Object.entries(sp)) {
    if (v != null && k !== "tab") {
      params.set(k, Array.isArray(v) ? v[0] : v);
    }
  }
  return redirect(`/orders?${params.toString()}`);
}
