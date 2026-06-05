import { cn } from "@/lib/utils";

/**
 * A labelled horizontal proportion bar — one segment per category, sized by
 * its share of the total. Dependency-free, for at-a-glance breakdowns.
 */
export function BreakdownBar({
  title,
  segments,
}: {
  title: string;
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s, i) => (
          <div
            key={i}
            className={cn("h-full", s.color)}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={cn("h-2.5 w-2.5 rounded-sm", s.color)} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-medium">{s.value.toLocaleString()}</span>
            <span className="w-12 text-right text-xs text-muted-foreground">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
