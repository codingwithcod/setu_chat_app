import { ComingSoon } from "@/components/admin/ComingSoon";
import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Manage admins and platform-wide feature flags."
      icon={Settings}
    />
  );
}
