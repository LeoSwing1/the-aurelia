import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MoveUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingBand } from "@/components/booking-band";
import { Guestbook } from "@/components/guestbook";

export const metadata={title:{absolute:"The Aurelia | Hotel & Resort"},description:"Discover The Aurelia Hotel & Resort: considered stays, meaningful gatherings and celebrations. Explore rooms, venues and facilities."};
const stories=[
 {n:"01",eyebrow:"THE STAY",title:"A quieter kind of escape.",copy:"Thoughtfully considered spaces invite you to slow down, settle in and make the most of every moment.",image:"https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85",href:"/rooms",link:"EXPLORE ROOMS"},
 {n:"02",eyebrow:"CELEBRATIONS",title:"Moments worth gathering for.",copy:"From intimate occasions to grand celebrations, discover spaces made for coming together.",image:"https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85",href:"/weddings",link:"DISCOVER CELEBRATIONS"},
 {n:"03",eyebrow:"MEETINGS & EVENTS",title:"Room for every possibility.",copy:"Flexible settings for thoughtful conversations, important milestones and memorable events.",image:"https://images.unsplash.com/photo-1517457373958-b7ffb1d6d5f5?auto=format&fit=crop&w=1400&q=85",href:"/venues",link:"EXPLORE VENUES"}
];
export default function Home(){return <><SiteHeader/><main id="main-content">
  <section className="hero">
    <div className="hero-image" aria-hidden="true"><Image src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2400&q=85" alt="" fill priority sizes="100vw" quality={82}/></div>
    <div className="hero-shade"/>
    <div className="hero-content"><span className="eyebrow light">A PLACE TO PAUSE. A PLACE TO BELONG.</span><h1>Stay a little<br/><em>closer to wonder.</em></h1><p>Discover a welcoming address for considered stays, meaningful gatherings and celebrations worth remembering.</p><Link href="/book" className="hero-cta">DISCOVER THE AURELIA <ArrowUpRight size={16}/></Link></div>
    <div className="hero-bottom"><span>HOTEL & RESORT</span><span className="hero-scroll"><ArrowDown size={14}/> SCROLL TO DISCOVER</span><span>IMAGERY FOR DESIGN PREVIEW</span></div>
  </section>

  <BookingBand/>

  <section className="intro-section"><div className="intro-side"><span className="eyebrow">THE AURELIA EXPERIENCE</span><span className="vertical-note">HOSPITALITY, WITH HEART</span></div><div className="intro-main"><h2>Some places are<br/>made to be <em>felt.</em></h2><p>There is a certain ease in finding a place that brings people together. A place for unhurried mornings, joyful celebrations and the moments in between. Welcome to The Aurelia.</p><Link href="/facilities" className="text-link">GET TO KNOW US <MoveUpRight size={15}/></Link></div><div className="intro-photo"><Image src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=85" alt="Temporary architectural inspiration photograph" width={1100} height={850} sizes="(max-width: 760px) 100vw, 34vw"/></div></section>

  <section className="story-section"><div className="section-heading"><div><span className="eyebrow">EXPLORE THE AURELIA</span><h2>Made for the moments<br/><em>that matter.</em></h2></div><p>Every visit has its own rhythm. Find the setting that feels right for yours.</p></div>
    {stories.map((s,i)=><article className={`story-row ${i%2===1?"reverse":""}`} key={s.n}><div className="story-image"><Image src={s.image.replace("photo-1517457373958-b7ffb1d6d5f5","photo-1497366754035-f200968a6e72")} alt={`${s.eyebrow} visual reference — replace with hotel photography`} width={1400} height={950} sizes="(max-width: 760px) 100vw, 55vw"/><span className="image-index">{s.n} / 03</span></div><div className="story-copy"><span className="eyebrow">{s.eyebrow}</span><h3>{s.title}</h3><p>{s.copy}</p><Link href={s.href} className="text-link">{s.link} <MoveUpRight size={15}/></Link></div></article>)}
  </section>

  <section className="capacity-section"><div className="capacity-image"><Image src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1500&q=85" alt="Temporary event-space visual reference" width={1500} height={1100} sizes="(max-width: 760px) 100vw, 50vw"/></div><div className="capacity-copy"><span className="eyebrow light">SPACE TO COME TOGETHER</span><h2>Bring everyone<br/>a little <em>closer.</em></h2><p>From weddings and family occasions to meetings and conferences, explore the possibilities at The Aurelia.</p><div className="capacity-stats"><div><strong>500</strong><span>WEDDING GUESTS*</span></div><div><strong>30</strong><span>CONFERENCE GUESTS*</span></div></div><Link href="/venues" className="hero-cta">EXPLORE OUR SPACES <ArrowUpRight size={15}/></Link><small>*Capacities supplied by management and awaiting verification.</small></div></section>

  <Guestbook/>

  <section className="closing-section"><span className="eyebrow">YOUR NEXT CHAPTER BEGINS HERE</span><h2>We look forward<br/>to welcoming <em>you.</em></h2><Link href="/contact" className="dark-cta">CONNECT WITH AURELIA <ArrowUpRight size={15}/></Link></section>
</main><SiteFooter/></>}
