import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
const ROLES = ["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION", "EVENT_MANAGER", "HOUSEKEEPING", "FINANCE"];

async function getActor() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const { data: profile } = await auth.from("profiles").select("role,active").eq("id", user.id).single();
  return profile?.active && ROLES.includes(profile.role) ? user : null;
}

export async function GET() {
  if (!await getActor()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const db = createAdminClient();
  const { data, error } = await db.from("hotel_schedules").select("id,title,description,category,starts_at,ends_at,assigned_to,notify_email,reminder_minutes_before,status,created_at").order("starts_at", { ascending: true }).limit(300);
  if (error) return NextResponse.json({ error: "Unable to load calendar" }, { status: 500 });
  return NextResponse.json({ schedules: data || [], hotelTimeZone: "Asia/Kolkata" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.title !== "string" || body.title.trim().length < 2 || body.title.length > 160) return NextResponse.json({ error: "Enter an activity title (2–160 characters)." }, { status: 400 });
  if (typeof body.startsAt !== "string" || !Number.isFinite(Date.parse(body.startsAt))) return NextResponse.json({ error: "Choose a valid start date and time." }, { status: 400 });
  if (body.endsAt && (typeof body.endsAt !== "string" || !Number.isFinite(Date.parse(body.endsAt)) || Date.parse(body.endsAt) <= Date.parse(body.startsAt))) return NextResponse.json({ error: "End time must be later than start time." }, { status: 400 });
  const recipient = typeof body.notifyEmail === "string" ? body.notifyEmail.trim().toLowerCase() : env.hotelEmail;
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return NextResponse.json({ error: "Enter a valid reminder email address." }, { status: 400 });
  const allowed = ["RESERVATION", "GUEST", "HOUSEKEEPING", "EVENT", "STAFF", "PAYMENT", "OTHER"];
  const category = typeof body.category === "string" && allowed.includes(body.category) ? body.category : "OTHER";
  const reminder = Number(body.reminderMinutesBefore ?? 60);
  if (!Number.isInteger(reminder) || reminder < 0 || reminder > 10080) return NextResponse.json({ error: "Reminder must be between 0 minutes and 7 days." }, { status: 400 });

  const db = createAdminClient();
  const startsAt = new Date(body.startsAt).toISOString();
  const { data, error } = await db.from("hotel_schedules").insert({
    title: body.title.trim(), description: typeof body.description === "string" ? body.description.trim().slice(0, 3000) : "",
    category, starts_at: startsAt, ends_at: body.endsAt ? new Date(String(body.endsAt)).toISOString() : null,
    assigned_to: typeof body.assignedTo === "string" ? body.assignedTo.trim().slice(0, 120) : null,
    notify_email: recipient, reminder_minutes_before: reminder, created_by: actor.id,
  }).select("id,title,starts_at,reminder_minutes_before").single();
  if (error || !data) return NextResponse.json({ error: "Could not create this schedule. Apply the scheduler database migration first." }, { status: 500 });
  const sendAt = new Date(new Date(data.starts_at).getTime() - data.reminder_minutes_before * 60000).toISOString();
  const { error: reminderError } = await db.from("hotel_schedule_reminders").insert({ schedule_id: data.id, send_at: sendAt });
  if (reminderError) {
    await db.from("hotel_schedules").delete().eq("id", data.id);
    return NextResponse.json({ error: "Schedule saved could not be paired with its reminder. Please retry." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, schedule: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!await getActor()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; status?: string } | null;
  if (!body?.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !["COMPLETED", "CANCELLED", "SCHEDULED"].includes(body.status || "")) return NextResponse.json({ error: "Invalid schedule update." }, { status: 400 });
  const db = createAdminClient();
  const { error } = await db.from("hotel_schedules").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) return NextResponse.json({ error: "Unable to update schedule." }, { status: 500 });
  if (body.status === "CANCELLED") await db.from("hotel_schedule_reminders").update({ status: "CANCELLED" }).eq("schedule_id", body.id).eq("status", "PENDING");
  return NextResponse.json({ ok: true });
}
