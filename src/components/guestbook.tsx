"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, Instagram, MapPin, Quote, Star, Heart, BookOpen, Sparkles } from "lucide-react";

const pages = [
  { type: "A WELCOME NOTE", title: <>A stay is made of <em>little moments.</em></>, copy: "A warm welcome at the door. A quiet morning. A table shared with family. We hope your time at The Aurelia is filled with moments worth remembering.", sign: "With gratitude, The Aurelia Hotel & Resort", decoration: "A NOTE FOR EVERY GUEST" },
  { type: "WEDDINGS & CELEBRATIONS", title: <>For the days that become <em>memories.</em></>, copy: "From intimate gatherings to grand celebrations, our team would be delighted to help shape your occasion. Share your date, guest count and preferred venue to begin a personal conversation and receive a tailored quotation.", sign: "Your day, thoughtfully brought to life", decoration: "THE CELEBRATION BOOK" },
  { type: "GUEST REVIEWS", title: <>The most meaningful words are <em>yours.</em></>, copy: "We value honest feedback from guests who have stayed, dined or celebrated with us. Explore our official Google profile to read genuine experiences or share your own review after your visit.", sign: "Thank you for being part of our story", decoration: "A WORD FROM YOU" },
  { type: "FOLLOW OUR STORY", title: <>A little more of <em>The Aurelia.</em></>, copy: "Discover venue inspiration, special moments and updates from the hotel. Follow our official Instagram page and stay close to the experiences unfolding here.", sign: "The story continues beyond your stay", decoration: "STAY CONNECTED" },
  { type: "UNTIL WE MEET AGAIN", title: <>We look forward to <em>welcoming you back.</em></>, copy: "Whether you are planning another stay, a family celebration or a wedding, our team is here to help. Reach out whenever the next occasion begins to take shape.", sign: "With gratitude, The Aurelia Hotel & Resort", decoration: "THE FINAL PAGE, NOT THE END" },
];

export function Guestbook() {
  // -1 is the front cover; 0–4 are the five inside pages.
  const [page, setPage] = useState(-1);
  const googleBusiness = process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL;
  const googleReviews = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL;
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const isCover = page === -1;
  const current = isCover ? null : pages[page];
  const turn = (direction: number) => setPage((p) => Math.max(-1, Math.min(4, p + direction)));
  const goTo = (next: number) => setPage(next);

  return <section className="guestbook-section" aria-labelledby="guestbook-title">
    <div className="guestbook-heading"><span className="eyebrow">THE AURELIA · A BOOK OF MOMENTS</span><h2 id="guestbook-title">The <em>Guestbook.</em></h2><p>A keepsake of celebrations, kind words and moments worth remembering.</p></div>
    <div className="guestbook-layout">
      <div className="guestbook-book-shell">
        <div className="guestbook-book" aria-label={isCover ? "Guestbook front cover" : `Guestbook page ${page + 1} of 5`}>
          <div className="guestbook-cover-edge"/><div className="guestbook-spine" aria-hidden="true"/><div className="guestbook-page-stack" aria-hidden="true"/>
          <AnimatePresence mode="wait" initial={false}>
            {isCover ? <motion.article key="cover" className="guestbook-page guestbook-front-cover" initial={{ rotateY: 82, opacity: .25, x: 14 }} animate={{ rotateY: 0, opacity: 1, x: 0 }} exit={{ rotateY: -82, opacity: .1, x: -12 }} transition={{ duration: .68, ease: [0.22, 1, .36, 1] }}>
              <div className="guestbook-cover-ornament"><Sparkles size={18}/><span>THE AURELIA COLLECTION</span><Sparkles size={18}/></div>
              <div className="guestbook-cover-monogram">A</div>
              <span className="guestbook-cover-kicker">HOTEL &amp; RESORT</span>
              <h3>The <em>Guestbook</em></h3>
              <p>A collection of moments, celebrations<br/>and memories made here.</p>
              <div className="guestbook-cover-rule"><span/><span>✦</span><span/></div>
              <span className="guestbook-cover-edition">AURELIA · EST. WITH HOSPITALITY</span>
            </motion.article> : <motion.article key={page} className="guestbook-page" initial={{ rotateY: 82, opacity: .25, x: 14 }} animate={{ rotateY: 0, opacity: 1, x: 0 }} exit={{ rotateY: -82, opacity: .1, x: -12 }} transition={{ duration: .68, ease: [0.22, 1, .36, 1] }}>
              <div className="guestbook-page-top"><span>{current!.type}</span><BookOpen size={17}/></div>
              <span className="guestbook-page-decoration">{current!.decoration}</span>
              <h3>{current!.title}</h3><p>{current!.copy}</p><span className="guestbook-signoff">{current!.sign}</span>
              <div className="guestbook-page-bottom"><span>THE AURELIA HOTEL &amp; RESORT</span><span>{String(page + 1).padStart(2, "0")} / 05</span></div>
            </motion.article>}
          </AnimatePresence>
          <div className="guestbook-controls"><button type="button" onClick={() => turn(-1)} disabled={isCover} aria-label="Previous guestbook page"><ArrowLeft size={17}/></button><span>{isCover ? "COVER" : `PAGE  ${String(page + 1).padStart(2, "0")}  /  05`}</span><button type="button" onClick={() => turn(1)} disabled={page === 4} aria-label="Turn to next guestbook page"><ArrowRight size={17}/></button></div>
        </div>
        <div className="guestbook-page-dots" aria-label="Choose guestbook page"><button type="button" aria-label="Front cover" aria-current={isCover ? "page" : undefined} onClick={() => goTo(-1)}/>{pages.map((item, index) => <button key={item.type} type="button" aria-label={`Go to page ${index + 1}`} aria-current={page === index ? "page" : undefined} onClick={() => goTo(index)}/>)}</div>
      </div>
      <aside className="guestbook-links"><span className="eyebrow">OUTSIDE THE PAGES</span><h3>Find us. Follow us. <em>Tell your story.</em></h3><p>Official hotel links for directions, updates and genuine guest reviews.</p>
        <a className="guestbook-social-card google" href={googleBusiness || undefined} target={googleBusiness ? "_blank" : undefined} rel="noreferrer" aria-disabled={!googleBusiness}><span className="guestbook-card-icon"><MapPin size={20}/></span><span><strong>Google Business</strong><small>Find the hotel and plan your visit</small></span><ExternalLink size={15}/></a>
        <a className="guestbook-social-card review" href={googleReviews || undefined} target={googleReviews ? "_blank" : undefined} rel="noreferrer" aria-disabled={!googleReviews}><span className="guestbook-card-icon"><Star size={20}/></span><span><strong>Guest reviews</strong><small>Read or share an authentic review</small></span><ExternalLink size={15}/></a>
        <a className="guestbook-social-card instagram" href={instagram || undefined} target={instagram ? "_blank" : undefined} rel="noreferrer" aria-disabled={!instagram}><span className="guestbook-card-icon"><Instagram size={20}/></span><span><strong>Instagram</strong><small>Follow The Aurelia moments</small></span><ExternalLink size={15}/></a>
        <div className="guestbook-wedding-note"><Quote size={18}/><div><strong>Planning a wedding?</strong><p>Share your date, guest count and preferred venue. Our team will prepare a personalised quotation.</p><a href="/weddings">Enquire about weddings <ArrowRight size={14}/></a></div><Heart size={18}/></div>
        {!googleBusiness && !googleReviews && !instagram && <small className="guestbook-config-note">Official Google and Instagram links will appear here once added to the production environment.</small>}
      </aside>
    </div>
  </section>;
}
