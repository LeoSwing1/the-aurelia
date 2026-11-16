import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  room_number: z.string().trim().min(1).max(20),
  floor: z.string().trim().max(40).nullable().optional(),
  room_type_id: z.string().uuid(),
  status: z.enum(["AVAILABLE", "DIRTY", "CLEANING", "INSPECTED", "MAINTENANCE", "INACTIVE"]).default("AVAILABLE"),
  active: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireStaffRole(["SUPER_ADMIN", "GENERAL_MANAGER"]);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid room details." }, { status: 400 });
    const db = createAdminClient();
    const { data, error } = await db.from("rooms").insert(parsed.data).select("id,room_number,floor,room_type_id,status,active").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await db.from("audit_logs").insert({ actor_id: user.id, action: "PHYSICAL_ROOM_CREATED", entity_type: "room", entity_id: data.id, details: parsed.data });
    return NextResponse.json({ room: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create room." }, { status: 403 });
  }
}
