import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

/**
 * Server-side guard for the entire admin area. Re-checks role on every
 * request (the middleware bounce is the first line; this is the real gate).
 * A non-admin never gets HTML back — they're redirected to /chat.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/chat");

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AdminSidebar email={ctx.email} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
