import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  room_number: z.string().trim().min(1).max(20),
  floor: z.string().trim().max(40).nullable().optional(),
  room_type_id: z.string().uuid(),
  status: z.enum(["AVAILABLE", "DIRTY", "CLEANING", "INSPECTED", "MAINTENANCE", "INACTIVE"]),
  active: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireStaffRole(["SUPER_ADMIN", "GENERAL_MANAGER"]);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid room details." }, { status: 400 });
    const { id } = await params;
    const db = createAdminClient();
    const { data: current, error: currentError } = await db.from("rooms").select("room_type_id").eq("id", id).single();
    if (currentError || !current) return NextResponse.json({ error: "Physical room was not found." }, { status: 404 });
    const { data: assignments, error: assignmentError } = await db.from("reservation_room_assignments").select("id").eq("room_id", id).is("released_at", null).limit(1);
    if (assignmentError) return NextResponse.json({ error: "Could not verify room assignment status." }, { status: 503 });
    if (assignments?.length && (current.room_type_id !== parsed.data.room_type_id || parsed.data.status === "MAINTENANCE" || !parsed.data.active)) {
      return NextResponse.json({ error: "This room has an active reservation assignment. Release or check out the assignment before changing its category, active state or maintenance status." }, { status: 409 });
    }
    const { data, error } = await db.from("rooms").update(parsed.data).eq("id", id).select("id,room_number,floor,room_type_id,status,active").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await db.from("audit_logs").insert({ actor_id: user.id, action: "PHYSICAL_ROOM_UPDATED", entity_type: "room", entity_id: id, details: parsed.data });
    return NextResponse.json({ room: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update room." }, { status: 403 });
  }
}
