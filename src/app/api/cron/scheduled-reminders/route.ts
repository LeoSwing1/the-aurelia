import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGuestEmail } from "@/lib/notifications";
import { hotelNoticeEmail } from "@/lib/email-templates";
import { formatHotelDateTime } from "@/lib/time";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  const now = new Date().toISOString();
  const { data: due, error } = await db.from("hotel_schedule_reminders")
    .select("id,schedule_id,send_at,attempts,hotel_schedules(id,title,description,category,starts_at,ends_at,assigned_to,notify_email,status)")
    .eq("status", "PENDING").lte("send_at", now).order("send_at", { ascending: true }).limit(20);
  if (error) return NextResponse.json({ error: "Unable to fetch due reminders" }, { status: 500 });

  let sent = 0; let skipped = 0; let failed = 0;
  for (const reminder of due || []) {
    const { data: claim } = await db.from("hotel_schedule_reminders").update({ status: "PROCESSING", attempts: Number(reminder.attempts || 0) + 1 }).eq("id", reminder.id).eq("status", "PENDING").select("id").maybeSingle();
    if (!claim) { skipped++; continue; }
    const schedule = Array.isArray(reminder.hotel_schedules) ? reminder.hotel_schedules[0] : reminder.hotel_schedules;
    if (!schedule || schedule.status !== "SCHEDULED") {
      await db.from("hotel_schedule_reminders").update({ status: "CANCELLED" }).eq("id", reminder.id);
      skipped++; continue;
    }
    const html = hotelNoticeEmail({
      title: `Reminder: ${schedule.title}`,
      intro: "This is an automated reminder for an upcoming hotel activity.",
      rows: [
        ["Activity", schedule.title], ["Category", schedule.category],
        ["Starts", formatHotelDateTime(schedule.starts_at)],
        ...(schedule.ends_at ? [["Ends", formatHotelDateTime(schedule.ends_at)] as [string, string]] : []),
        ...(schedule.assigned_to ? [["Assigned to", schedule.assigned_to] as [string, string]] : []),
        ...(schedule.description ? [["Details", schedule.description] as [string, string]] : []),
      ],
    });
    try {
      const guestResult = await sendGuestEmail(schedule.notify_email, `The Aurelia reminder: ${schedule.title}`, html);
      if (!guestResult.sent) throw new Error(guestResult.reason);
      await db.from("hotel_schedule_reminders").update({ status: "SENT", sent_at: new Date().toISOString(), last_error: null }).eq("id", reminder.id);
      sent++;
    } catch (e) {
      const attempts = Number(reminder.attempts || 0) + 1;
      await db.from("hotel_schedule_reminders").update({ status: attempts >= 3 ? "FAILED" : "PENDING", send_at: new Date(Date.now() + 5 * 60000).toISOString(), last_error: e instanceof Error ? e.message.slice(0, 500) : "Email delivery failed" }).eq("id", reminder.id);
      failed++;
    }
  }
  return NextResponse.json({ ok: true, checked: due?.length || 0, sent, skipped, failed, checkedAt: now, timeZone: "Asia/Kolkata" });
}
