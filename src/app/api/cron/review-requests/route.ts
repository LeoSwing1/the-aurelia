import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { deliverReviewRequest, releaseStaleReviewClaims } from "@/lib/review-requests";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Without the official review link nothing is sent and the queue is left untouched.
  if (!env.googleReviewsUrl) return NextResponse.json({ ok: true, skipped: "NEXT_PUBLIC_GOOGLE_REVIEWS_URL is not configured" });

  const db = createAdminClient();
  await releaseStaleReviewClaims(db);
  const now = new Date().toISOString();
  const { data: due, error } = await db.from("guest_review_requests").select("id").eq("status", "PENDING").lte("send_at", now).order("send_at", { ascending: true }).limit(25);
  if (error) return NextResponse.json({ error: "Unable to fetch due review requests" }, { status: 500 });

  const counts = { sent: 0, retrying: 0, failed: 0, cancelled: 0, skipped: 0 };
  for (const row of due || []) {
    const result = await deliverReviewRequest(db, row.id);
    if (result.status === "SENT") counts.sent++;
    else if (result.status === "PENDING") counts.retrying++;
    else if (result.status === "FAILED") counts.failed++;
    else if (result.status === "CANCELLED") counts.cancelled++;
    else counts.skipped++;
  }
  return NextResponse.json({ ok: true, checked: due?.length || 0, ...counts, checkedAt: now });
}
