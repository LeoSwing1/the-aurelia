import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { sendGuestEmail } from "@/lib/notifications";
import { googleReviewRequestEmail } from "@/lib/email-templates";
import { formatHotelDate } from "@/lib/time";

export const MAX_REVIEW_ATTEMPTS = 3;
/** A PROCESSING row older than this is treated as abandoned (e.g. function timeout) and retried. */
const STALE_PROCESSING_MINUTES = 15;

type Relation<T> = T | T[] | null;
const one = <T,>(value: Relation<T>): T | null => (Array.isArray(value) ? value[0] ?? null : value);

type ReviewRow = {
  id: string;
  attempts: number | null;
  guest_email: string;
  reservations: Relation<{ booking_reference: string; check_in: string; check_out: string; status: string; guests: Relation<{ full_name: string | null }> }>;
};

export type ReviewSendResult = { status: "SENT" | "PENDING" | "FAILED" | "CANCELLED" | "SKIPPED"; error?: string };

/** Claim one review request, send it, and record the outcome. Safe to call concurrently. */
export async function deliverReviewRequest(db: SupabaseClient, requestId: string): Promise<ReviewSendResult> {
  if (!env.googleReviewsUrl) return { status: "SKIPPED", error: "NEXT_PUBLIC_GOOGLE_REVIEWS_URL is not configured." };

  const { data: current } = await db.from("guest_review_requests").select("attempts").eq("id", requestId).maybeSingle();
  if (!current) return { status: "SKIPPED", error: "Review request not found." };
  const attempts = Number(current.attempts || 0) + 1;

  // Claim: only one worker can move PENDING -> PROCESSING.
  const { data: claimed } = await db.from("guest_review_requests")
    .update({ status: "PROCESSING", attempts, updated_at: new Date().toISOString() })
    .eq("id", requestId).eq("status", "PENDING")
    .select("id,attempts,guest_email,reservations(booking_reference,check_in,check_out,status,guests(full_name))")
    .maybeSingle<ReviewRow>();
  if (!claimed) return { status: "SKIPPED", error: "Already being processed or not pending." };

  const reservation = one(claimed.reservations);
  if (!reservation || reservation.status !== "CHECKED_OUT") {
    await db.from("guest_review_requests").update({ status: "CANCELLED", last_error: "Reservation is not checked out.", updated_at: new Date().toISOString() }).eq("id", requestId);
    return { status: "CANCELLED", error: "Reservation is not checked out." };
  }

  const guestName = one(reservation.guests)?.full_name?.trim() || "Guest";
  const html = googleReviewRequestEmail({
    guestName,
    reference: reservation.booking_reference,
    checkIn: formatHotelDate(`${reservation.check_in}T00:00:00+05:30`),
    checkOut: formatHotelDate(`${reservation.check_out}T00:00:00+05:30`),
    reviewUrl: env.googleReviewsUrl,
  });

  try {
    const result = await sendGuestEmail(claimed.guest_email, "How was your stay at The Aurelia?", html);
    if (!result.sent) throw new Error(result.reason);
    await db.from("guest_review_requests").update({ status: "SENT", sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", requestId);
    return { status: "SENT" };
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : "Email delivery failed";
    const failed = attempts >= MAX_REVIEW_ATTEMPTS;
    await db.from("guest_review_requests").update({
      status: failed ? "FAILED" : "PENDING",
      send_at: new Date(Date.now() + 30 * 60000).toISOString(),
      last_error: message,
      updated_at: new Date().toISOString(),
    }).eq("id", requestId);
    return { status: failed ? "FAILED" : "PENDING", error: message };
  }
}

/** Return abandoned PROCESSING rows to the queue so a timeout never strands a request. */
export async function releaseStaleReviewClaims(db: SupabaseClient) {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60000).toISOString();
  await db.from("guest_review_requests").update({ status: "PENDING", updated_at: new Date().toISOString() }).eq("status", "PROCESSING").lt("updated_at", cutoff);
}
