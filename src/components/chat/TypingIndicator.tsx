import type { TypingUser } from "@/types";

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const names =
    users.length === 1
      ? users[0].username
      : users.length === 2
      ? `${users[0].username} and ${users[1].username}`
      : `${users[0].username} and ${users.length - 1} others`;

  return (
    <div className="flex items-center gap-2 py-2 px-1 animate-fade-in">
      <div className="flex gap-0.5">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot" />
      </div>
      <span className="text-xs text-muted-foreground">
        {names} {users.length === 1 ? "is" : "are"} typing...
      </span>
    </div>
  );
}
