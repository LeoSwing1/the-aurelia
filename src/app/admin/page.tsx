import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLiveOverview } from "@/components/admin-live-overview";

export const dynamic = "force-dynamic";

export default async function Admin() {
  await requireStaffRole(["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION", "FINANCE"]);
  const db = createAdminClient();
  const [reservations, pending, events, rooms, notifications, payments] = await Promise.all([
    db.from("reservations").select("id", { count: "exact", head: true }),
    db.from("reservations").select("id", { count: "exact", head: true }).eq("status", "PENDING_APPROVAL"),
    db.from("event_enquiries").select("id", { count: "exact", head: true }).in("status", ["NEW", "CONTACTED", "QUOTATION_SENT"]),
    db.from("rooms").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("notifications").select("id,title,body,created_at,read_at").order("created_at", { ascending: false }).limit(8),
    db.from("payment_transactions").select("amount").eq("status", "CAPTURED"),
  ]);
  const paymentRows = (payments.data || []) as Array<{ amount: number | string | null }>;
  const revenue = paymentRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const initial = {
    metrics: [
      { label: "Reservations", value: reservations.count ?? 0, description: "All booking channels" },
      { label: "Pending approvals", value: pending.count ?? 0, description: "Require manager review" },
      { label: "Open event enquiries", value: events.count ?? 0, description: "Awaiting follow-up" },
      { label: "Physical rooms entered", value: rooms.count ?? 0, description: "Of 42 category inventory" },
    ],
    revenue,
    notifications: (notifications.data || []) as Array<{ id: string; title: string; body: string; created_at: string; read_at: string | null }>,
  };

  return (
    <>
      <div className="admin-top">
        <div>
          <div className="section-kicker">HOTEL OPERATIONS</div>
          <h1>Management overview</h1>
          <p className="admin-lead">Live operating snapshot for The Aurelia.</p>
        </div>
        <span className="pill">LIVE DATABASE</span>
      </div>
      <AdminLiveOverview initial={initial} />
      <section className="panel">
        <h2>Inventory overview</h2>
        <p className="admin-lead">Current client brief: 40 Deluxe rooms and 2 Executive rooms. Enter verified physical room numbers under Room Inventory before assigning rooms to arriving guests.</p>
      </section>
    </>
  );
}
