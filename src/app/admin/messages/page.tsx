import { ComingSoon } from "@/components/admin/ComingSoon";
import { MessageSquare } from "lucide-react";

export default function AdminMessagesPage() {
  return (
    <ComingSoon
      title="Messages"
      description="Moderation feed — search, review and remove flagged content."
      icon={MessageSquare}
    />
  );
}
