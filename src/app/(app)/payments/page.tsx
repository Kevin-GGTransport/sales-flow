import { redirect } from "next/navigation";

/** 旧 /payments 列表已并入结算中心（307 透传 query，收藏夹不断链） */
export default async function PaymentsPage({
  searchParams,
}: PageProps<"/payments">) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "payments" });
  for (const [k, v] of Object.entries(sp)) {
    if (v != null && k !== "tab") {
      params.set(k, Array.isArray(v) ? v[0] : v);
    }
  }
  return redirect(`/settlement?${params.toString()}`);
}
