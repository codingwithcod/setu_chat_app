import { Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Wrench className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        We&rsquo;ll be right back
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Setu is undergoing scheduled maintenance. The chat will be available
        again shortly — thanks for your patience.
      </p>
    </div>
  );
}
