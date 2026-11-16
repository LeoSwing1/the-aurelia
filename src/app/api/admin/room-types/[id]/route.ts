import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  base_rate: z.number().finite().min(0).max(10000000),
  total_inventory: z.number().int().min(0).max(500),
  max_adults: z.number().int().min(1).max(20),
  max_children: z.number().int().min(0).max(20),
  active: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireStaffRole(["SUPER_ADMIN", "GENERAL_MANAGER"]);
  try {
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid room category details." }, { status: 400 });
    const db = createAdminClient();
    const { count, error: roomCountError } = await db.from("rooms").select("id", { count: "exact", head: true }).eq("room_type_id", id).eq("active", true);
    if (roomCountError) return NextResponse.json({ error: "Could not verify physical room inventory." }, { status: 503 });
    if ((count || 0) > parsed.data.total_inventory) return NextResponse.json({ error: `Inventory cannot be lower than the ${count} active physical room records in this category.` }, { status: 409 });
    const { data, error } = await db.from("room_types").update({
      ...parsed.data,
    }).eq("id", id).select("id,code,name,total_inventory,max_adults,max_children,base_rate,currency,active").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await db.from("audit_logs").insert({ action: "ROOM_CATEGORY_UPDATED", entity_type: "room_type", entity_id: id, details: parsed.data });
    return NextResponse.json({ roomType: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update room category.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
