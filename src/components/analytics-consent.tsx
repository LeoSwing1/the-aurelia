"use client";
import Script from "next/script";
import { useEffect, useState } from "react";

import { isValidGaId, isValidMetaPixelId } from "@/lib/site-url";

// The G-XXXXXXXXXX placeholder from .env.example must never load gtag.
const RAW_GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GA_ID = isValidGaId(RAW_GA_ID) ? RAW_GA_ID : undefined;
const RAW_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
// Meta Pixel for Facebook/Instagram ads measurement; loads only after the same analytics opt-in.
const PIXEL_ID = isValidMetaPixelId(RAW_PIXEL_ID) ? RAW_PIXEL_ID : undefined;
export function AnalyticsConsent() {
  const [choice, setChoice] = useState<"accepted" | "rejected" | null>(null);
  // Server-rendered visible so the banner paints with the page instead of ~2 s later after hydration
  // (it was the page's LCP element). Returning visitors are hidden before paint by the <head> script.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const saved = window.localStorage.getItem("aurelia-analytics-consent");
    if (saved === "accepted" || saved === "rejected") { setChoice(saved); setVisible(false); }
  }, []);
  function choose(value: "accepted" | "rejected") {
    window.localStorage.setItem("aurelia-analytics-consent", value);
    setChoice(value); setVisible(false);
  }
  return <>
    {GA_ID && choice === "accepted" && <><Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" /><Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_ID}', { anonymize_ip: true });`}</Script></>}
    {PIXEL_ID && choice === "accepted" && <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}</Script>}
    {visible && <section className="analytics-consent" aria-label="Analytics preferences"><div><strong>Your privacy matters</strong><p>We use optional analytics{PIXEL_ID ? " and ads measurement (Meta)" : ""} to understand website performance and improve the guest experience. You can accept or reject analytics cookies. Essential site functions work either way.</p></div><div className="analytics-consent-actions"><button type="button" onClick={() => choose("rejected")}>Reject optional</button><button type="button" onClick={() => choose("accepted")}>Accept analytics</button></div></section>}
  </>;
}
