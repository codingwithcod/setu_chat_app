import Link from "next/link";
import { MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-6">
            <MessageSquareOff className="h-16 w-16 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold gradient-text">404</h1>
          <h2 className="text-xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground max-w-md">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Let&apos;s get you back to your conversations.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/chat">Back to Chat</Link>
        </Button>
      </div>
    </div>
  );
}
