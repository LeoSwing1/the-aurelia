"use client";

import { formatHotelDateTime } from "@/lib/time";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";

type Notice = { id: string; title: string; body: string; category: string; created_at: string; read_at: string | null };

export function AdminLiveNotifications() {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [error, setError] = useState("");
  const latest = useRef<string | null>(null);
  const seen = useRef(new Set<string>());

  const load = useCallback(async (initial = false) => {
    try {
      const query = latest.current ? `?since=${encodeURIComponent(latest.current)}` : "";
      const response = await fetch(`/api/admin/notifications${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not refresh notifications");
      const payload = await response.json() as { notifications: Notice[] };
      const incoming = payload.notifications || [];
      if (incoming.length) {
        const newest = incoming[0].created_at;
        if (initial || !latest.current) {
          setItems(incoming);
        } else {
          const fresh = incoming.filter((n) => !seen.current.has(n.id));
          if (fresh.length) {
            setItems((current) => [...fresh, ...current].slice(0, 40));
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              fresh.slice(0, 3).forEach((n) => new Notification(n.title, { body: n.body, tag: n.id, icon: "/favicon.ico" }));
            }
          }
        }
        incoming.forEach((n) => seen.current.add(n.id));
        if (!latest.current || newest > latest.current) latest.current = newest;
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Notification refresh failed");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
    void load(true);
    const timer = window.setInterval(() => void load(false), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") new Notification("The Aurelia notifications enabled", { body: "New reservation and enquiry alerts will appear while this admin portal is open." });
  }

  async function markRead(id: string) {
    const response = await fetch("/api/admin/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok) setItems((current) => current.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  const unread = items.filter((n) => !n.read_at).length;
  return <div className="admin-live-notifications">
    <button className="admin-bell-button" type="button" aria-label="Open live notifications" onClick={() => setOpen((v) => !v)}>
      {unread ? <BellRing size={18} /> : <Bell size={18} />}<span>Alerts</span>{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}
    </button>
    {open && <section className="admin-notification-popover" aria-label="Live notifications">
      <header><div><strong>Live notifications</strong><small>Refreshes every 15 seconds</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={17}/></button></header>
      <div className="admin-notification-settings"><span>Chrome notifications: {permission === "granted" ? "Enabled" : permission === "denied" ? "Blocked in browser settings" : permission === "unsupported" ? "Not supported" : "Not enabled"}</span>{permission !== "granted" && permission !== "denied" && permission !== "unsupported" && <button type="button" onClick={enableBrowserNotifications}>Enable</button>}</div>
      {error && <p className="admin-notification-error">{error}</p>}
      <div className="admin-notification-list">{items.map((n) => <article key={n.id} className={n.read_at ? "is-read" : "is-unread"}><div><strong>{n.title}</strong><small>{n.category} · {formatHotelDateTime(n.created_at)}</small></div><p>{n.body}</p>{!n.read_at && <button type="button" onClick={() => void markRead(n.id)}><CheckCheck size={14}/> Mark read</button>}</article>)}{!items.length && <p className="admin-notification-empty">No new activity yet. New booking and enquiry activity will appear here.</p>}</div>
    </section>}
  </div>;
}
