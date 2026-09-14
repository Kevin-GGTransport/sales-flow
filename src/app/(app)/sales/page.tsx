import { redirect } from "next/navigation";

/** 旧 /sales 列表已并入单据中心（307 透传 query，收藏夹不断链） */
export default async function SalesPage({ searchParams }: PageProps<"/sales">) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "sales" });
  for (const [k, v] of Object.entries(sp)) {
    if (v != null && k !== "tab") {
      params.set(k, Array.isArray(v) ? v[0] : v);
    }
  }
  return redirect(`/orders?${params.toString()}`);
}
