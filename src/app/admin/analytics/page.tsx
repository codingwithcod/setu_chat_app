import { ComingSoon } from "@/components/admin/ComingSoon";
import { BarChart3 } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <ComingSoon
      title="Analytics"
      description="DAU/WAU/MAU, retention and message-volume breakdowns."
      icon={BarChart3}
    />
  );
}
