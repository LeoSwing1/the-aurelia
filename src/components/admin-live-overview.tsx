"use client";

import { formatHotelDateTime } from "@/lib/time";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, ArrowRight } from "lucide-react";

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

type OverviewSchedule = { id: string; title: string; category: string; starts_at: string; assigned_to: string | null; status: string };

type Snapshot = {
  metrics: Metric[];
  revenue: number;
  notifications: Notice[];
};

export function AdminLiveOverview({ initial }: { initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [hotelNow, setHotelNow] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<OverviewSchedule[]>([]);
  const [scheduleError, setScheduleError] = useState(false);
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
    const updateClock = () => setHotelNow(new Date());
    updateClock();
    const clockTimer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadSchedules = async () => {
      try {
        const response = await fetch("/api/admin/schedules", { cache: "no-store" });
        if (!response.ok) throw new Error("Schedule fetch failed");
        const data = await response.json();
        if (active) {
          setSchedules((data.schedules || []).filter((item: OverviewSchedule) => item.status === "SCHEDULED"));
          setScheduleError(false);
        }
      } catch {
        if (active) setScheduleError(true);
      }
    };
    void loadSchedules();
    const timer = window.setInterval(() => void loadSchedules(), 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const upcomingSchedules = useMemo(() => schedules
    .filter(item => new Date(item.starts_at).getTime() >= Date.now())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 4), [schedules]);

  const hotelClock = hotelNow ? new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  }).format(hotelNow) : "—:—:—";
  const hotelDate = hotelNow ? new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(hotelNow) : "Loading hotel date…";

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

      <section className="panel overview-schedule-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">HOTEL OPERATIONS · IST</span>
            <h2>Clock &amp; Schedule</h2>
          </div>
          <Link href="/admin/schedule" className="text-link">OPEN CALENDAR <ArrowRight size={14} /></Link>
        </div>
        <div className="overview-schedule-grid">
          <div className="overview-clock-card">
            <div className="overview-clock-icon"><Clock3 size={19} /></div>
            <strong>{hotelClock}</strong>
            <span>{hotelDate}</span>
            <small>India Standard Time · UTC+05:30</small>
          </div>
          <div className="overview-upcoming-card">
            <div className="overview-upcoming-title"><CalendarDays size={18} /><strong>Upcoming activities</strong></div>
            {scheduleError ? (
              <p className="admin-lead">Schedule information is temporarily unavailable. Open the calendar to retry.</p>
            ) : upcomingSchedules.length ? upcomingSchedules.map(item => (
              <article className="overview-schedule-row" key={item.id}>
                <div><strong>{item.title}</strong><small>{item.category}{item.assigned_to ? ` · ${item.assigned_to}` : ""}</small></div>
                <time>{formatHotelDateTime(item.starts_at)}</time>
              </article>
            )) : <p className="admin-lead">No upcoming activities. Add reservations, guest tasks, housekeeping, events or staff reminders to your calendar.</p>}
          </div>
        </div>
      </section>

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
