"use client";

import { useEffect, useState } from "react";

export function AureliaLoadingSplash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Already shown in this browser session: skip it (the html class also hides it before hydration).
    let seen = false;
    try { seen = Boolean(window.sessionStorage.getItem("aurelia-splash-seen")); window.sessionStorage.setItem("aurelia-splash-seen", "1"); } catch { /* storage blocked: keep the original behaviour */ }
    if (seen) { setVisible(false); return; }
    const minimum = window.setTimeout(() => setLeaving(true), 1000);
    const finish = window.setTimeout(() => setVisible(false), 1350);
    return () => {
      window.clearTimeout(minimum);
      window.clearTimeout(finish);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className={`aurelia-loading-splash${leaving ? " is-leaving" : ""}`} role="status" aria-live="polite" aria-label="Loading The Aurelia">
      <div className="aurelia-splash-inner">
        <span className="aurelia-splash-monogram">A</span>
        <div className="aurelia-splash-name">THE AURELIA</div>
        <div className="aurelia-splash-subtitle">HOTEL &amp; RESORT</div>
        <span className="aurelia-splash-rule" />
        <span className="aurelia-splash-caption">PREPARING YOUR EXPERIENCE</span>
        <span className="aurelia-splash-spinner" />
      </div>
    </div>
  );
}
