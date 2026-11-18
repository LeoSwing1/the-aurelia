import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScheduleCalendar } from "@/components/schedule-calendar";
export const dynamic = "force-dynamic";
export default async function SchedulePage() {
  await requireStaffRole(["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION", "EVENT_MANAGER", "HOUSEKEEPING", "FINANCE"]);
  const db = createAdminClient();
  const { data } = await db.from("hotel_schedules").select("id,title,description,category,starts_at,ends_at,assigned_to,notify_email,reminder_minutes_before,status").order("starts_at", { ascending: true }).limit(300);
  return <><div className="admin-top"><div><div className="eyebrow">HOTEL OPERATIONS · PLANNING</div><h1>Schedule &amp; Calendar</h1><p className="admin-lead">Plan guest activities, reservations, housekeeping, events, staff tasks and payment reminders. All times are shown in India Standard Time.</p></div></div><ScheduleCalendar initialSchedules={data || []} defaultEmail="leovsmgrowth@gmail.com" /></>;
}
