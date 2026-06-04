import { ComingSoon } from "@/components/admin/ComingSoon";
import { Code2 } from "lucide-react";

export default function AdminDevelopersPage() {
  return (
    <ComingSoon
      title="Developers"
      description="API keys, usage volume and webhook activity across all developers."
      icon={Code2}
    />
  );
}
