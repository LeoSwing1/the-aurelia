import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { deliverReviewRequest } from "@/lib/review-requests";

export const runtime = "nodejs";
const ALLOWED = ["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION"];

/** Send (or resend) the Google review request for a checked-out stay, immediately. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await session.from("profiles").select("role,active").eq("id", user.id).single();
  if (!profile?.active || !ALLOWED.includes(profile.role)) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid reservation." }, { status: 400 });
  if (!env.googleReviewsUrl) return NextResponse.json({ error: "Add the official Google review link (NEXT_PUBLIC_GOOGLE_REVIEWS_URL) in Vercel first." }, { status: 409 });

  const db = createAdminClient();
  const { data: reservation } = await db.from("reservations").select("id,status,transactional_contact_consent,guests(email)").eq("id", id).maybeSingle();
  if (!reservation) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  if (reservation.status !== "CHECKED_OUT") return NextResponse.json({ error: "Review requests can only be sent after check-out." }, { status: 409 });
  if (!reservation.transactional_contact_consent) return NextResponse.json({ error: "This guest did not give contact permission on the booking form." }, { status: 409 });
  const guest = Array.isArray(reservation.guests) ? reservation.guests[0] : reservation.guests;
  const email = typeof guest?.email === "string" ? guest.email.trim().toLowerCase() : "";
  if (!email.includes("@")) return NextResponse.json({ error: "No valid guest email on this reservation." }, { status: 409 });

  const nowIso = new Date().toISOString();
  const { data: existing } = await db.from("guest_review_requests").select("id,status").eq("reservation_id", id).maybeSingle();
  let requestId = existing?.id as string | undefined;
  if (existing?.status === "PROCESSING") return NextResponse.json({ error: "This review request is being sent right now." }, { status: 409 });
  if (existing) {
    await db.from("guest_review_requests").update({ status: "PENDING", send_at: nowIso, guest_email: email, source: "MANUAL", attempts: 0, last_error: null, requested_by: user.id, updated_at: nowIso }).eq("id", existing.id);
  } else {
    const { data: created, error } = await db.from("guest_review_requests").insert({ reservation_id: id, guest_email: email, send_at: nowIso, source: "MANUAL", requested_by: user.id }).select("id").single();
    if (error || !created) return NextResponse.json({ error: "Could not queue the review request. Apply migration 202611180003 first." }, { status: 500 });
    requestId = created.id;
  }

  const result = await deliverReviewRequest(db, requestId!);
  if (result.status === "SENT") return NextResponse.json({ ok: true, status: "SENT", resent: Boolean(existing && existing.status === "SENT") });
  return NextResponse.json({ error: result.error || "Review email could not be sent.", status: result.status }, { status: 502 });
}
