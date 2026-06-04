import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </header>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
        <Icon className="h-10 w-10 text-muted-foreground" />
        <p className="mt-4 text-sm font-medium">{description}</p>
        <p className="mt-1 text-xs text-muted-foreground">Coming soon.</p>
      </div>
    </div>
  );
}
