import { cn } from "@/lib/utils";

/**
 * Minimal dependency-free bar chart. Renders relative bar heights for a small
 * time series — gridlines + a baseline keep it readable even when the data is
 * sparse (mostly-zero days).
 */
export function TrendChart({
  title,
  data,
  color = "bg-primary",
}: {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString()} total
        </span>
      </div>

      {/* Plot area */}
      <div className="relative h-36">
        {/* Horizontal gridlines + scale labels */}
        {[1, 0.5, 0].map((frac) => (
          <div
            key={frac}
            className="absolute inset-x-0 flex items-center"
            style={{ top: `${(1 - frac) * 100}%` }}
          >
            <span className="w-7 shrink-0 pr-1 text-right text-[9px] leading-none text-muted-foreground/70">
              {Math.round(max * frac)}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
        ))}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1 pl-7">
          {data.map((d, i) => (
            <div
              key={i}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
            >
              <div
                className={cn(
                  "w-full rounded-t-[3px] transition-all group-hover:opacity-80",
                  d.value > 0 ? color : "bg-transparent"
                )}
                style={{
                  height: d.value > 0 ? `${Math.max((d.value / max) * 100, 4)}%` : 0,
                }}
              />
              <span className="pointer-events-none absolute -top-6 z-10 hidden whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background group-hover:block">
                {d.value} · {d.label.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* X-axis range */}
      {data.length > 0 && (
        <div className="mt-2 flex justify-between pl-7 text-[10px] text-muted-foreground">
          <span>{data[0]?.label?.slice(5)}</span>
          {peak && peak.value > 0 && (
            <span className="text-foreground/70">
              peak {peak.value} on {peak.label.slice(5)}
            </span>
          )}
          <span>{data[data.length - 1]?.label?.slice(5)}</span>
        </div>
      )}
    </div>
  );
}
