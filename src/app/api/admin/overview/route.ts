import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await auth.from("profiles").select("role,active").eq("id", user.id).single();
  if (!profile?.active || !["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION", "FINANCE"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createAdminClient();
  const [reservations, pending, events, rooms, notifications, payments] = await Promise.all([
    db.from("reservations").select("id", { count: "exact", head: true }),
    db.from("reservations").select("id", { count: "exact", head: true }).eq("status", "PENDING_APPROVAL"),
    db.from("event_enquiries").select("id", { count: "exact", head: true }).in("status", ["NEW", "CONTACTED", "QUOTATION_SENT"]),
    db.from("rooms").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("notifications").select("id,title,body,created_at,read_at").order("created_at", { ascending: false }).limit(8),
    db.from("payment_transactions").select("amount").eq("status", "CAPTURED"),
  ]);

  const firstError = reservations.error || pending.error || events.error || rooms.error || notifications.error || payments.error;
  if (firstError) {
    return NextResponse.json({ error: "Unable to refresh dashboard data" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const paymentRows = (payments.data || []) as Array<{ amount: number | string | null }>;
  const revenue = paymentRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return NextResponse.json({
    metrics: [
      { label: "Reservations", value: reservations.count ?? 0, description: "All booking channels" },
      { label: "Pending approvals", value: pending.count ?? 0, description: "Require manager review" },
      { label: "Open event enquiries", value: events.count ?? 0, description: "Awaiting follow-up" },
      { label: "Physical rooms entered", value: rooms.count ?? 0, description: "Of 42 category inventory" },
    ],
    revenue,
    notifications: notifications.data || [],
  }, { headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie" } });
}
