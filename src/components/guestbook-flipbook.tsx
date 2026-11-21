"use client";
import { trackEvent } from "@/lib/analytics";

import { useMemo, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Instagram, MapPin, Quote, Star } from "lucide-react";

type Spread = { eyebrow: string; title: string; body: string; note: string; kind: "intro" | "google" | "instagram" | "wedding" | "guest" };

const spreads: Spread[] = [
  { kind: "intro", eyebrow: "THE AURELIA GUESTBOOK", title: "A place in your story.", body: "Every stay, celebration and gathering leaves something behind. Turn the pages and discover the ways to share your experience with us.", note: "A collection of moments, told by the people who make them." },
  { kind: "google", eyebrow: "GOOGLE · GUEST REVIEWS", title: "Your words matter.", body: "Read guest feedback on our Google Business Profile, or share your own experience after your visit.", note: "Live rating and review excerpts will appear here once the official profile is connected." },
  { kind: "instagram", eyebrow: "INSTAGRAM · MOMENTS AT AURELIA", title: "The moments between.", body: "A glimpse of celebrations, thoughtful details and days worth remembering. Follow along and tag us in the moments you would like to share.", note: "Connect the official Instagram account to feature its latest posts here." },
  { kind: "wedding", eyebrow: "WEDDINGS · NOTES FROM THE DAY", title: "The beginning of forever.", body: "A wedding is made of a thousand little moments. We would love to collect the words and memories of couples who have celebrated with us.", note: "Couple testimonials and approved wedding photographs can be added by the hotel team." },
  { kind: "guest", eyebrow: "A NOTE FOR THE NEXT GUEST", title: "Leave a little kindness.", body: "Have you stayed with us or celebrated a special day here? Your feedback helps our team make every welcome more meaningful.", note: "We look forward to reading your story." },
];

export function GuestbookFlipbook({ variant = "all" }: { variant?: "all" | "weddings" }) {
  const [page, setPage] = useState(0);
  const reduced = useReducedMotion();
  const items = useMemo(() => variant === "weddings" ? spreads.filter((s) => ["intro", "wedding", "guest", "google"].includes(s.kind)) : spreads, [variant]);
  const current = items[page];
  const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL;
  const reviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL || process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || googleUrl;
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const turn = (direction: number) => setPage((p) => Math.max(0, Math.min(items.length - 1, p + direction)));

  return (
    <section className="guestbook-section" aria-label="The Aurelia guestbook">
      <div className="guestbook-heading">
        <span className="eyebrow">KIND WORDS & SHARED MOMENTS</span>
        <h2>Every visit leaves<br/><em>a little something.</em></h2>
        <p>A guestbook for the stories, celebrations and moments that make The Aurelia.</p>
      </div>
      <div className="guestbook-stage">
        <div className="guestbook-book" aria-live="polite">
          <div className="guestbook-spine" aria-hidden="true" />
          <LazyMotion features={domAnimation} strict><AnimatePresence mode="wait" initial={false}>
            <m.article
              key={`${variant}-${page}`}
              className={`guestbook-page guestbook-page-${current.kind}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, rotateY: page === 0 ? -8 : 18, x: 28 }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, rotateY: -16, x: -24 }}
              transition={{ duration: reduced ? 0.15 : 0.48, ease: [0.22, 0.7, 0.2, 1] }}
            >
              <div className="guestbook-page-top"><span>THE AURELIA</span><span>{String(page + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span></div>
              <div className="guestbook-page-content">
                <span className="eyebrow">{current.eyebrow}</span>
                <div className="guestbook-ornament"><span/><span/><span/></div>
                <h3>{current.title}</h3>
                <p>{current.body}</p>
                {current.kind === "google" && <div className="guestbook-links"><a href={googleUrl || "#guestbook-links"} target={googleUrl ? "_blank" : undefined} rel="noreferrer" aria-disabled={!googleUrl} onClick={!googleUrl ? (e) => e.preventDefault() : undefined}><MapPin size={16}/> View Google profile</a><a href={reviewUrl || "#guestbook-links"} target={reviewUrl ? "_blank" : undefined} rel="noreferrer" aria-disabled={!reviewUrl} onClick={!reviewUrl ? (e) => e.preventDefault() : undefined}><Star size={16}/> Write a review</a></div>}
                {current.kind === "instagram" && <a className="guestbook-social" href={instagramUrl || "#guestbook-links"} target={instagramUrl ? "_blank" : undefined} rel="noreferrer" aria-disabled={!instagramUrl} onClick={(e) => { if (!instagramUrl) { e.preventDefault(); return; } trackEvent("select_content",{content_type:"outbound_profile",item_id:"instagram",location:"guestbook_flipbook"}); }}><Instagram size={17}/> Follow The Aurelia on Instagram</a>}
                {current.kind === "wedding" && <div className="guestbook-quote-mark"><Quote size={28}/><span>YOUR WEDDING STORY, HERE</span></div>}
                {current.kind === "guest" && <a className="guestbook-social" onClick={()=>trackEvent("select_content",{content_type:"outbound_profile",item_id:"google_review",location:"guestbook_flipbook"})} href={reviewUrl || "/contact"} target={reviewUrl ? "_blank" : undefined} rel="noreferrer"><Star size={16}/> Share your experience</a>}
                <small>{current.note}</small>
              </div>
              <div className="guestbook-page-bottom"><span>HOSPITALITY, WITH HEART</span><span>✦</span></div>
            </m.article>
          </AnimatePresence></LazyMotion>
        </div>
        <div className="guestbook-controls"><button type="button" onClick={() => turn(-1)} disabled={page === 0} aria-label="Previous page"><ArrowLeft size={17}/><span>PREVIOUS</span></button><span className="guestbook-progress">{page + 1} <i/> {items.length}</span><button type="button" onClick={() => turn(1)} disabled={page === items.length - 1} aria-label="Next page"><span>NEXT</span><ArrowRight size={17}/></button></div>
      </div>
      <p className="guestbook-disclaimer">Guest reviews and social posts will be displayed only after the hotel connects its official accounts and approves the content.</p>
    </section>
  );
}
