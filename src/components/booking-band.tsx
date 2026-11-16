"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function BookingBand() {
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [adults, setAdults] = useState(2);
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const valid = Boolean(arrival && departure && departure > arrival);
  const href = valid ? `/book?checkIn=${arrival}&checkOut=${departure}&adults=${adults}` : "/book";
  return <section className="booking-band">
    <div className="booking-intro"><span className="eyebrow">YOUR TIME AT AURELIA</span><strong>Begin your stay.</strong></div>
    <label className="booking-field"><span>ARRIVAL</span><input aria-label="Arrival date" type="date" min={minDate} value={arrival} onChange={e=>{setArrival(e.target.value);if(departure&&e.target.value>=departure)setDeparture("");}}/></label>
    <label className="booking-field"><span>DEPARTURE</span><input aria-label="Departure date" type="date" min={arrival||minDate} value={departure} onChange={e=>setDeparture(e.target.value)}/></label>
    <label className="booking-field"><span>ADULTS</span><select aria-label="Number of adults" value={adults} onChange={e=>setAdults(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} Adult{n===1?"":"s"}</option>)}</select></label>
    <Link href={href} className="booking-submit">{valid?"CONTINUE":"CHOOSE DATES"} <ArrowUpRight size={15}/></Link>
    <p className="booking-note">{arrival&&departure&&!valid?"Departure must be after arrival.":"Your dates and guest count will carry into the stay enquiry."}</p>
  </section>;
}
