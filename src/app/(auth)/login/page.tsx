import { redirect } from "next/navigation";
import { BarChart3, Boxes, FileText, ReceiptText } from "lucide-react";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/layout/LoginForm";

const modules = [
  { icon: Boxes, label: "库存" },
  { icon: ReceiptText, label: "销账" },
  { icon: FileText, label: "开票" },
  { icon: BarChart3, label: "报表" },
];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#e9eee8] p-3 text-[#15251f] sm:p-6 lg:p-10">
      <div aria-hidden="true" className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(34,79,61,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(34,79,61,.055)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div aria-hidden="true" className="absolute -left-28 top-1/4 size-72 rounded-full bg-[#adc5b4]/35 blur-3xl" />

      <section className="relative mx-auto grid min-h-[calc(100svh-1.5rem)] w-full max-w-6xl overflow-hidden rounded-[1.25rem] border border-[#1e4939]/20 bg-[#f8faf6] shadow-[0_28px_80px_rgba(18,48,37,.16)] sm:min-h-[calc(100svh-3rem)] lg:min-h-[min(760px,calc(100svh-5rem))] lg:grid-cols-[1.08fr_.92fr]">
        <div className="relative hidden overflow-hidden bg-[#133e31] p-12 text-[#eff5ec] lg:flex lg:flex-col">
          <div aria-hidden="true" className="absolute inset-y-0 right-8 border-r border-dashed border-[#c6d9c9]/20" />
          <div aria-hidden="true" className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(238,246,235,.08)_1px,transparent_1px)] [background-size:100%_44px]" />
          <div className="relative flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-sm border border-[#b9d0bd]/45 bg-[#f2f5eb]/10 font-heading text-xl font-semibold">销</div>
            <div><p className="font-heading text-xl font-semibold tracking-[.12em]">销售部管理系统</p><p className="mt-0.5 font-mono text-[10px] uppercase tracking-[.2em] text-[#b7c9bb]">Sales management system</p></div>
          </div>
          <div className="relative my-auto max-w-md py-14">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[.28em] text-[#9eb7a4]">营业账簿 · 总册</p>
            <h1 className="font-heading text-5xl font-semibold leading-[1.22] tracking-tight text-balance">每一件配件，<br />每一笔往来，<br /><span className="text-[#bcd1b9]">都有迹可循。</span></h1>
            <p className="mt-7 max-w-sm text-sm leading-7 text-[#c7d4ca]">集中管理汽车配件的采购、销售、库存与结算，让日常经营清楚落账。</p>
          </div>
          <div className="relative grid grid-cols-4 border-y border-[#bfd0c1]/18 py-5">
            {modules.map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-2 text-xs text-[#c5d3c7]"><Icon className="size-3.5 text-[#91b49d]" strokeWidth={1.6} />{label}</div>)}
          </div>
          <div className="relative mt-5 flex justify-between font-mono text-[10px] uppercase tracking-[.18em] text-[#7f9f8a]"><span>Internal system</span><span>No. SF-2026</span></div>
        </div>

        <div className="relative flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-[400px]">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="grid size-10 place-items-center rounded-sm bg-[#173f32] font-heading text-lg font-semibold text-white">销</div>
              <div><p className="font-heading text-lg font-semibold tracking-[.1em] text-[#18392e]">销售部管理系统</p><p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#72837a]">Sales management system</p></div>
            </div>
            <div className="mb-9">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[.24em] text-[#6e8278]">Operator access</p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#163a2d] sm:text-[2.15rem]">欢迎回来</h2>
              <p className="mt-3 text-sm leading-6 text-[#68776f]">登录后继续处理今天的业务。</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
