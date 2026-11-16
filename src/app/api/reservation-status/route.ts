import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const lookupSchema = z.object({
  reference: z.string().trim().min(6).max(32),
  email: z.string().trim().email().max(254),
});

export async function POST(request: NextRequest) {
  try {
    const input = lookupSchema.parse(await request.json());
    const db = createAdminClient();
    const { data, error } = await db
      .from("reservations")
      .select("booking_reference,check_in,check_out,room_quantity,adults,children,status,payment_status,total_amount,currency,created_at,guests!inner(full_name,email)")
      .ilike("booking_reference", input.reference)
      .ilike("guests.email", input.email)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, error: "We couldn't find a reservation matching that reference and email. Check both details and try again." }, { status: 404 });
    return NextResponse.json({ ok: true, reservation: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check reservation status.";
    const status = message.includes("Supabase is not configured") ? 503 : 400;
    return NextResponse.json({ ok: false, error: status === 503 ? "Reservation lookup is temporarily unavailable. Please contact the hotel." : message }, { status });
  }
}
