import { redirect } from "next/navigation";

/** 旧 /custody 列表已并入库存页代保管 Tab（307 透传 query，收藏夹不断链） */
export default async function CustodyPage({
  searchParams,
}: PageProps<"/custody">) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "custody" });
  for (const [k, v] of Object.entries(sp)) {
    if (v != null && k !== "tab") {
      params.set(k, Array.isArray(v) ? v[0] : v);
    }
  }
  return redirect(`/inventory?${params.toString()}`);
}
