"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

const links=[["The Stay","/rooms"],["Celebrations","/weddings"],["Meetings & Events","/venues"],["Experiences","/facilities"],["Contact","/contact"]];
export function SiteHeader(){
  const [open,setOpen]=useState(false);
  const [compact,setCompact]=useState(false);
  useEffect(()=>{
    const update=()=>setCompact(window.scrollY>48);
    update();
    window.addEventListener("scroll",update,{passive:true});
    return ()=>window.removeEventListener("scroll",update);
  },[]);
  return <header className={`site-header${compact?" is-compact":""}`}>
    <Link href="/" className="brand-lockup" onClick={()=>setOpen(false)}>
      <span className="brand-mark" aria-hidden="true">A</span><span className="brand-name">THE AURELIA<small>HOTEL & RESORT</small></span>
    </Link>
    <nav className="desktop-nav">{links.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</nav>
    <div className="header-actions"><Link href="/book" className="header-book">RESERVE YOUR STAY <ArrowUpRight size={14}/></Link><button className="mobile-menu" onClick={()=>setOpen(!open)} aria-label="Toggle navigation">{open?<X/>:<Menu/>}</button></div>
    {open&&<nav className="mobile-nav">{links.map(([label,href])=><Link href={href} key={href} onClick={()=>setOpen(false)}>{label}<ArrowUpRight size={15}/></Link>)}<Link href="/book" className="mobile-book" onClick={()=>setOpen(false)}>RESERVE YOUR STAY</Link></nav>}
  </header>;
}