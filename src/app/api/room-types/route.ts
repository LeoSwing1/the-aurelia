import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = createAdminClient();
    const { data, error } = await db.from("room_types").select("code,name,total_inventory,max_adults,max_children,base_rate,currency").eq("active", true).order("name");
    if (error) return NextResponse.json({ error: "Room categories are temporarily unavailable." }, { status: 503 });
    return NextResponse.json({ roomTypes: data || [] }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "Room categories are temporarily unavailable." }, { status: 503 });
  }
}
