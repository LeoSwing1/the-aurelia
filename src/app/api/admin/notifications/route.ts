import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function authorised() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return false;
  const { data: profile } = await auth.from("profiles").select("role,active").eq("id", user.id).single();
  return Boolean(profile?.active && ["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION", "EVENT_MANAGER", "HOUSEKEEPING", "FINANCE", "RESTAURANT_STAFF"].includes(profile.role));
}

export async function GET(request: NextRequest) {
  if (!await authorised()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const since = request.nextUrl.searchParams.get("since");
  const db = createAdminClient();
  let query = db.from("notifications").select("id,title,body,category,created_at,read_at").order("created_at", { ascending: false }).limit(25);
  if (since && !Number.isNaN(Date.parse(since))) query = query.gt("created_at", since);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 });
  return NextResponse.json({ notifications: data || [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest) {
  if (!await authorised()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "A valid notification ID is required" }, { status: 400 });
  const db = createAdminClient();
  const { error } = await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", body.id).is("read_at", null);
  if (error) return NextResponse.json({ error: "Unable to update notification" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
