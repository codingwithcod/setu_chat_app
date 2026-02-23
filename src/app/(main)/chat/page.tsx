import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4 p-8">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-primary/10 p-6">
            <MessageSquare className="h-16 w-16 text-primary/60" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Welcome to <span className="gradient-text">Setu</span>
        </h2>
        <p className="text-muted-foreground max-w-md">
          Select a conversation from the sidebar or start a new chat to begin
          messaging. Your conversations are end-to-end secured.
        </p>
      </div>
    </div>
  );
}
