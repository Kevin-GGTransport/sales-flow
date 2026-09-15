import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/money";
import type { CashRow, MonthlyRow, ProfitMonthRow, ProfitPartRow, InventoryReportRow } from "@/lib/reports";

type Series = {
  label: string;
  colorClass: string;
  values: number[];
};

const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function compactUSD(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`;
  if (absolute >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="border-b pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ExactDataTable({ title, series }: { title: string; series: Series[] }) {
  return (
    <details className="mt-3 border-t pt-3 text-xs">
      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">查看精确数据</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-xl border-collapse text-right font-mono">
          <caption className="sr-only">{title}各月份精确数据</caption>
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 text-left font-sans font-medium">系列</th>
              {MONTHS.map((month) => <th key={month} className="px-1 py-2 font-medium">{Number(month)}月</th>)}
            </tr>
          </thead>
          <tbody>
            {series.map((item) => (
              <tr key={item.label} className="border-b last:border-0">
                <th className="py-2 text-left font-sans font-medium whitespace-nowrap">{item.label}</th>
                {item.values.map((itemValue, index) => <td key={MONTHS[index]} className="px-1 py-2 whitespace-nowrap">{formatUSD(itemValue)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function GroupedBars({ title, series }: { title: string; series: Series[] }) {
  const allValues = series.flatMap((item) => item.values);
  const max = Math.max(0, ...allValues);
  const min = Math.min(0, ...allValues);
  const range = max - min;

  if (range === 0) {
    return (
      <>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">全年金额为 {formatUSD(0)}</div>
        <ExactDataTable title={title} series={series} />
      </>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {series.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span className={`size-2.5 rounded-[2px] ${item.colorClass}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
      <div className="grid h-64 grid-cols-[3rem_minmax(0,1fr)] grid-rows-[14rem_2rem]">
        <div className="relative" aria-hidden="true">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <span key={ratio} className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground" style={{ top: `${ratio * 100}%` }}>
              {compactUSD(max - range * ratio)}
            </span>
          ))}
        </div>
        <div className="relative border-b border-l">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <span key={ratio} className="absolute inset-x-0 h-px bg-border/60" style={{ top: `${ratio * 100}%` }} />
          ))}
            {min < 0 && <span className="absolute inset-x-0 z-10 h-px bg-foreground/70" style={{ top: `${(max / range) * 100}%` }} />}
          </div>
          <div className="relative z-10 grid h-full grid-cols-12 gap-1 sm:gap-2">
            {MONTHS.map((month, monthIndex) => (
              <div key={month} className="flex min-w-0 justify-center gap-px sm:gap-1">
                {series.map((item) => {
                  const value = item.values[monthIndex] ?? 0;
                  const top = value >= 0 ? ((max - value) / range) * 100 : (max / range) * 100;
                  const height = (Math.abs(value) / range) * 100;
                  return (
                    <div key={item.label} className="relative h-full w-full max-w-5">
                      <div
                        className={`absolute inset-x-0 ${value < 0 ? "rounded-b-[2px] bg-destructive" : `rounded-t-[2px] ${item.colorClass}`} transition-opacity hover:opacity-75`}
                        style={{ top: `${top}%`, height: `${Math.max(value === 0 ? 0 : 2, height)}%` }}
                        title={`${monthIndex + 1} 月 · ${item.label} ${formatUSD(value)}`}
                        aria-label={`${monthIndex + 1} 月，${item.label} ${formatUSD(value)}${value < 0 ? "，负值" : ""}`}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div />
        <div className="grid grid-cols-12 gap-1 pt-2 sm:gap-2" aria-hidden="true">
          {MONTHS.map((month) => <span key={month} className="text-center font-mono text-[10px] text-muted-foreground">{Number(month)}</span>)}
        </div>
      </div>
      <p className="mt-3 text-right text-[11px] text-muted-foreground">横轴：月份 · 纵轴：美元</p>
      <ExactDataTable title={title} series={series} />
    </div>
  );
}

function fillMonths<T extends { month: string }>(rows: T[], field: keyof T): number[] {
  const map = new Map(rows.map((row) => [row.month.slice(-2), finiteNumber(row[field])]));
  return MONTHS.map((month) => map.get(month) ?? 0);
}

export function OrderTrendChart({ rows, year }: { rows: MonthlyRow[]; year: number }) {
  return (
    <ChartCard title="单据走势" description={`${year} 年买入与卖出金额对比`}>
      <GroupedBars title="单据走势"
        series={[
          { label: "卖出（钱入）", colorClass: "bg-chart-1", values: fillMonths(rows, "saleAmount") },
          { label: "买入（钱出）", colorClass: "bg-chart-4", values: fillMonths(rows, "purchaseAmount") },
        ]}
      />
    </ChartCard>
  );
}

export function CashTrendChart({ rows, year }: { rows: CashRow[]; year: number }) {
  return (
    <ChartCard title="现金流走势" description={`${year} 年实际收付款节奏`}>
      <GroupedBars title="现金流走势"
        series={[
          { label: "实收", colorClass: "bg-chart-2", values: fillMonths(rows, "received") },
          { label: "实付", colorClass: "bg-chart-5", values: fillMonths(rows, "paid") },
        ]}
      />
    </ChartCard>
  );
}

export function ProfitTrendChart({ rows, year }: { rows: ProfitMonthRow[]; year: number }) {
  return (
    <ChartCard title="毛利走势" description={`${year} 年自营件收入、成本与毛利`}>
      <GroupedBars title="毛利走势"
        series={[
          { label: "自营收入", colorClass: "bg-chart-1", values: fillMonths(rows, "revenue") },
          { label: "成本", colorClass: "bg-chart-4", values: fillMonths(rows, "cost") },
          { label: "毛利", colorClass: "bg-chart-3", values: fillMonths(rows, "profit") },
        ]}
      />
    </ChartCard>
  );
}

function RankingBars({
  rows,
  value,
  valueLabel,
}: {
  rows: { id: string; label: string; sublabel: string; value: number }[];
  value: (amount: number) => string;
  valueLabel: string;
}) {
  const topRows = rows.slice(0, 8);
  const max = Math.max(0, ...topRows.map((row) => Math.abs(row.value)));

  if (topRows.length === 0 || max === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">暂无数据</div>;
  }

  return (
    <ol className="space-y-4">
      {topRows.map((row, index) => (
        <li key={row.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{row.label}</span>
              <span className="shrink-0 font-mono text-xs font-semibold">{value(row.value)}</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{row.sublabel}</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={row.value < 0 ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-chart-1"}
                style={{ width: row.value === 0 ? "0%" : `${Math.max(2, (Math.abs(row.value) / max) * 100)}%` }}
                role="img"
                aria-label={`${row.label}，${valueLabel} ${value(row.value)}`}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PartProfitChart({ rows, year }: { rows: ProfitPartRow[]; year: number }) {
  const ranked = [...rows]
    .sort((a, b) => finiteNumber(b.profit) - finiteNumber(a.profit))
    .map((row) => ({ id: row.partId, label: row.partNumber, sublabel: `${row.name} · 售出 ${row.qtySold} 件`, value: finiteNumber(row.profit) }));

  return (
    <ChartCard title="配件毛利贡献" description={`${year} 年自营件毛利排名 · 前 8 名`}>
      <RankingBars rows={ranked} value={formatUSD} valueLabel="毛利" />
    </ChartCard>
  );
}

export function InventoryValueChart({ rows }: { rows: InventoryReportRow[] }) {
  const ranked = [...rows]
    .sort((a, b) => finiteNumber(b.value) - finiteNumber(a.value))
    .map((row) => ({ id: row.partId, label: row.partNumber, sublabel: `${row.name} · 库存 ${row.qty}`, value: finiteNumber(row.value) }));

  return (
    <ChartCard title="库存价值结构" description="当前自营库存价值排名 · 前 8 名">
      <RankingBars rows={ranked} value={formatUSD} valueLabel="库存价值" />
    </ChartCard>
  );
}
