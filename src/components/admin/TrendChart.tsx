import { cn } from "@/lib/utils";

/**
 * Minimal dependency-free bar chart. Renders relative bar heights for a small
 * time series — enough for at-a-glance trend reading without pulling in a
 * charting library.
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

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>
      <div className="flex h-32 items-end gap-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex flex-1 flex-col items-center justify-end"
          >
            <div
              className={cn("w-full rounded-t transition-all", color)}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
            />
            <span className="pointer-events-none absolute -top-6 z-10 hidden rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
              {d.value}
            </span>
          </div>
        ))}
      </div>
      {data.length > 0 && (
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{data[0]?.label?.slice(5)}</span>
          <span>{data[data.length - 1]?.label?.slice(5)}</span>
        </div>
      )}
    </div>
  );
}
