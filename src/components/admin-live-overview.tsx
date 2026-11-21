"use client";

import { formatHotelDateTime } from "@/lib/time";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Metric = {
  label: string;
  value: number;
  description: string;
};

type Notice = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Snapshot = {
  metrics: Metric[];
  revenue: number;
  notifications: Notice[];
};

export function AdminLiveOverview({ initial }: { initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current || document.visibilityState === "hidden") return;

    inFlight.current = true;
    setRefreshing(true);

    try {
      const response = await fetch("/api/admin/overview", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        throw new Error("Dashboard refresh failed");
      }

      const next = (await response.json()) as Snapshot;

      setSnapshot(next);
      setLastUpdated(new Date().toISOString());
    } catch {
      // Keep the last known-good snapshot visible during transient network errors.
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 10000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <>
      <div className="metric-grid">
        {snapshot.metrics.map((metric) => (
          <div className="metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value.toLocaleString("en-IN")}</strong>
            <span>{metric.description}</span>
          </div>
        ))}

        <div className="metric">
          <span>Verified gateway collections</span>
          <strong>₹{snapshot.revenue.toLocaleString("en-IN")}</strong>
          <span>Captured transactions only</span>
        </div>
      </div>

      <div className="admin-live-refresh" aria-live="polite">
        <span
          className={
            refreshing ? "refresh-dot is-refreshing" : "refresh-dot"
          }
        />
        {refreshing
          ? "Updating live overview…"
          : lastUpdated
            ? `Last updated ${formatHotelDateTime(lastUpdated)}`
            : "Live overview · checks every 10 seconds"}
      </div>

      <div className="admin-dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent notifications</h2>
            <Link href="/admin/notifications" className="text-link">
              VIEW ALL ↗
            </Link>
          </div>

          {snapshot.notifications.length === 0 ? (
            <p className="admin-lead">
              No notifications yet. New booking and enquiry activity will
              appear here.
            </p>
          ) : (
            snapshot.notifications.map((notice) => (
              <article className="notification-row" key={notice.id}>
                <strong>{notice.title}</strong>
                <p>{notice.body}</p>
                <small>
                  {formatHotelDateTime(notice.created_at)}
                  {notice.read_at ? " · Read" : " · Unread"}
                </small>
              </article>
            ))
          )}
        </section>

        <section className="panel">
          <h2>Quick actions</h2>

          <div className="quick-links">
            <Link href="/admin/reservations">
              Review reservation requests ↗
            </Link>
            <Link href="/admin/events">
              Manage event enquiries ↗
            </Link>
            <Link href="/admin/rooms">
              Review room inventory ↗
            </Link>
            <Link href="/admin/finance">
              View payment records ↗
            </Link>
            <Link href="/admin/housekeeping">
              Open housekeeping ↗
            </Link>
            <Link href="/admin/integrations">
              Configure integrations ↗
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
