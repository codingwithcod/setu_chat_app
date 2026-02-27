import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "avatar" | "card" | "message";
}

export function LoadingSkeleton({ className, variant = "text" }: LoadingSkeletonProps) {
  if (variant === "avatar") {
    return (
      <div
        className={cn(
          "h-10 w-10 rounded-full bg-muted animate-pulse",
          className
        )}
      />
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("space-y-3 p-4", className)}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "message") {
    return (
      <div className={cn("flex gap-3 p-4", className)}>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-16 w-3/4 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("h-4 w-full rounded bg-muted animate-pulse", className)}
    />
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <LoadingSkeleton key={i} variant="card" />
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <LoadingSkeleton key={i} variant="message" />
      ))}
    </div>
  );
}
