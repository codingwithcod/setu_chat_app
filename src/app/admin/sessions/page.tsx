import { ComingSoon } from "@/components/admin/ComingSoon";
import { MonitorSmartphone } from "lucide-react";

export default function AdminSessionsPage() {
  return (
    <ComingSoon
      title="Sessions"
      description="Active device sessions across the platform with force-logout."
      icon={MonitorSmartphone}
    />
  );
}
