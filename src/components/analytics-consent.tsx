"use client";
import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export function AnalyticsConsent() {
  const [choice, setChoice] = useState<"accepted" | "rejected" | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("aurelia-analytics-consent");
    if (saved === "accepted" || saved === "rejected") setChoice(saved);
    else setVisible(true);
  }, []);
  function choose(value: "accepted" | "rejected") {
    window.localStorage.setItem("aurelia-analytics-consent", value);
    setChoice(value); setVisible(false);
  }
  return <>
    {GA_ID && choice === "accepted" && <><Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" /><Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_ID}', { anonymize_ip: true });`}</Script></>}
    {visible && <aside className="analytics-consent" role="dialog" aria-label="Analytics preferences"><div><strong>Your privacy matters</strong><p>We use optional analytics to understand website performance and improve the guest experience. You can accept or reject analytics cookies. Essential site functions work either way.</p></div><div className="analytics-consent-actions"><button type="button" onClick={() => choose("rejected")}>Reject optional</button><button type="button" onClick={() => choose("accepted")}>Accept analytics</button></div></aside>}
  </>;
}
