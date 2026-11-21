"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatHotelDateTime } from "@/lib/time";

type Props = { reservationId: string; status: string | null; sentAt: string | null; sendAt: string | null; lastError: string | null; consent: boolean };

/** Front-desk control for the post-stay Google review email on a checked-out reservation. */
export function ReviewRequestAction({ reservationId, status, sentAt, sendAt, lastError, consent }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const label = status === "SENT" ? "Resend review request" : "Send review request now";

  async function send() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/review-request`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the review request.");
      setNotice("Google review request sent.");
      router.refresh();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not send the review request."); }
    finally { setBusy(false); }
  }

  return <div className="approve-control review-request-control">
    <small>
      <b>Google review:</b>{" "}
      {status === "SENT" && sentAt ? `Sent ${formatHotelDateTime(sentAt)}`
        : status === "PENDING" && sendAt ? `Queued for ${formatHotelDateTime(sendAt)}`
        : status === "PROCESSING" ? "Sending…"
        : status === "FAILED" ? "Failed after 3 attempts"
        : status === "CANCELLED" ? "Cancelled"
        : consent ? "Not requested yet" : "No contact permission"}
    </small>
    {lastError && status !== "SENT" && <small title={lastError}>Last error: {lastError.slice(0, 80)}</small>}
    {consent && status !== "PROCESSING" && <button type="button" disabled={busy} onClick={() => void send()}>{busy ? "Sending…" : label}</button>}
    {notice && <small role="status">{notice}</small>}
  </div>;
}
