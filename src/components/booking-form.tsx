"use client";
import { useEffect, useMemo, useState } from "react";
import { ThankYouDialog } from "@/components/thank-you-dialog";
import { trackEvent } from "@/lib/analytics";

type FormState = "idle" | "sending" | "success" | "error";
type RoomOption = { code: string; name: string; base_rate: number | null; currency: string; max_adults?: number; max_children?: number };
const fallbackRooms: RoomOption[] = [
  { code: "deluxe", name: "Deluxe", base_rate: null, currency: "INR" },
  { code: "executive", name: "Executive", base_rate: null, currency: "INR" },
];
function dateToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nightsBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}
function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(amount);
}

export function BookingForm() {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [roomOptions, setRoomOptions] = useState<RoomOption[]>(fallbackRooms);
  const [roomType, setRoomType] = useState("deluxe");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [showThanks, setShowThanks] = useState(false);
  const [transactionalConsent, setTransactionalConsent] = useState(false);
  const [emailMarketingConsent, setEmailMarketingConsent] = useState(false);
  const [whatsappMarketingConsent, setWhatsappMarketingConsent] = useState(false);
  const [smsMarketingConsent, setSmsMarketingConsent] = useState(false);
  const today = dateToday();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialRoom = params.get("room")?.toLowerCase() || null;
    if (initialRoom === "executive" || initialRoom === "deluxe") setRoomType(initialRoom);
    setCheckIn(params.get("checkIn") || "");
    setCheckOut(params.get("checkOut") || "");
    const initialAdults = Number(params.get("adults"));
    if (Number.isInteger(initialAdults) && initialAdults >= 1 && initialAdults <= 12) setAdults(initialAdults);
    let active = true;
    fetch("/api/room-types", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Room categories unavailable")))
      .then((data) => {
        if (!active || !Array.isArray(data.roomTypes) || !data.roomTypes.length) return;
        setRoomOptions(data.roomTypes);
        // Preserve the visitor's requested category. Never reset it to the first API result.
        const requested = initialRoom && data.roomTypes.some((x: RoomOption) => x.code === initialRoom) ? initialRoom : roomType;
        if (data.roomTypes.some((x: RoomOption) => x.code === requested)) setRoomType(requested);
        else setRoomType(data.roomTypes[0].code);
      })
      .catch(() => undefined);
    return () => { active = false; };
  // Initial category is taken from the URL; changing it is handled by the select.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRoom = roomOptions.find((x) => x.code === roomType);
  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const totalGuests = adults + children;
  const estimatedTotal = selectedRoom?.base_rate != null && nights > 0 ? Number(selectedRoom.base_rate) * nights * rooms : null;
  const dateError = Boolean(checkIn && checkOut && checkOut <= checkIn);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (dateError || !nights) { setState("error"); setMessage("Please select a valid arrival and departure date. Departure must be after arrival."); return; }
    const formElement = e.currentTarget;
    setState("sending"); setMessage("");
    const form = new FormData(formElement);
    const summary = [
      `Stay summary: ${selectedRoom?.name || roomType}; ${nights} night(s); ${rooms} room(s); ${adults} adult(s); ${children} child(ren); ${totalGuests} guest(s) total.`,
      estimatedTotal == null ? "Room estimate: to be quoted by hotel management (no published rate configured)." : `Indicative room amount: ${money(estimatedTotal, selectedRoom?.currency || "INR")} (${money(Number(selectedRoom?.base_rate), selectedRoom?.currency || "INR")} × ${nights} night(s) × ${rooms} room(s)); taxes/add-ons, if any, are subject to hotel confirmation.`,
      `Additional requests: ${String(form.get("message") || "None")}`,
    ].join("\n");
    const payload = {
      name: String(form.get("name") || ""), email: String(form.get("email") || ""), phone: String(form.get("phone") || ""),
      roomType, checkIn, checkOut, adults, children, rooms, message: summary,
      transactionalConsent, emailMarketingConsent, whatsappMarketingConsent, smsMarketingConsent,
    };
    try {
      const availability = await fetch(`/api/availability?roomType=${encodeURIComponent(payload.roomType)}&checkIn=${payload.checkIn}&checkOut=${payload.checkOut}&rooms=${payload.rooms}`);
      const availabilityResult = await availability.json();
      if (!availability.ok) throw new Error(availabilityResult.error || "Availability could not be checked.");
      if (!availabilityResult.available) throw new Error(`Only ${availabilityResult.available_quantity} ${selectedRoom?.name || "category"} room(s) are currently available for those dates.`);
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit request.");
      trackEvent("generate_lead", { lead_type: "room_reservation", room_type: String(payload.roomType), rooms: Number(payload.rooms) });
      setReference(result.reference || ""); setState("success"); setMessage(result.message || "Request received."); setShowThanks(true);
      formElement.reset(); setCheckIn(""); setCheckOut(""); setAdults(2); setChildren(0); setRooms(1);
    } catch (err) { setState("error"); setMessage(err instanceof Error ? err.message : "Something went wrong."); }
  }

  return <form className="enquiry-form" onSubmit={submit}>
    <div className="form-grid">
      <label>YOUR NAME<input required name="name" autoComplete="name" placeholder="Full name" /></label>
      <label>EMAIL ADDRESS<input required type="email" name="email" autoComplete="email" placeholder="you@example.com" /></label>
      <label>PHONE NUMBER<input required type="tel" name="phone" autoComplete="tel" placeholder="+91" /></label>
      <label>ROOM CATEGORY<select name="roomType" value={roomType} onChange={(e) => setRoomType(e.target.value)}>{roomOptions.map((option) => <option key={option.code} value={option.code}>{option.name}{option.base_rate != null ? ` · ${money(Number(option.base_rate), option.currency)}/night` : " · Rate on request"}</option>)}</select></label>
      <label>ARRIVAL<input required type="date" name="checkIn" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(""); }} /></label>
      <label>DEPARTURE<input required type="date" name="checkOut" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label>
      <label>ADULTS<input required type="number" name="adults" min="1" max="12" value={adults} onChange={(e) => setAdults(Number(e.target.value))} /></label>
      <label>CHILDREN<input type="number" name="children" min="0" max="8" value={children} onChange={(e) => setChildren(Number(e.target.value))} /></label>
      <label>ROOMS<input required type="number" name="rooms" min="1" max="5" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} /></label>
      <label className="full-field">ADDITIONAL REQUESTS<textarea name="message" rows={3} placeholder="Tell us about any preferences or additions you would like to request" /></label>
    </div>
    <section className="communication-consent full-field" aria-labelledby="communication-heading">
      <div className="eyebrow" id="communication-heading">RESERVATION COMMUNICATIONS</div>
      <p>We need your contact details to manage this request and send essential reservation updates. Choose separately whether you would also like promotional messages.</p>
      <label className="consent-option"><input type="checkbox" checked={transactionalConsent} onChange={(e) => setTransactionalConsent(e.target.checked)} required /> <span><strong>Essential reservation communications (required)</strong><small>Allow The Aurelia to contact you by email, phone/SMS or WhatsApp about this enquiry, payment, changes and stay arrangements.</small></span></label>
      <label className="consent-option"><input type="checkbox" checked={emailMarketingConsent} onChange={(e) => setEmailMarketingConsent(e.target.checked)} /> <span><strong>Email offers and promotions (optional)</strong><small>Occasional offers, packages, events and hotel news.</small></span></label>
      <label className="consent-option"><input type="checkbox" checked={whatsappMarketingConsent} onChange={(e) => setWhatsappMarketingConsent(e.target.checked)} /> <span><strong>WhatsApp offers and promotions (optional)</strong><small>Promotional updates through WhatsApp. You can opt out at any time.</small></span></label>
      <label className="consent-option"><input type="checkbox" checked={smsMarketingConsent} onChange={(e) => setSmsMarketingConsent(e.target.checked)} /> <span><strong>SMS offers and promotions (optional)</strong><small>Promotional text messages to your mobile number.</small></span></label>
      <small>Marketing choices are optional and do not affect your reservation request. You can withdraw marketing consent at any time. See the hotel privacy notice for details.</small>
    </section>
    <section className="stay-summary" aria-live="polite">
      <div className="stay-summary-heading"><span className="eyebrow">YOUR STAY AT A GLANCE</span><strong>{nights ? `${nights} night${nights === 1 ? "" : "s"}` : "Choose your dates"}</strong></div>
      <div className="stay-summary-grid">
        <div><span>ROOM CATEGORY</span><b>{selectedRoom?.name || "—"}</b></div>
        <div><span>OCCUPANCY</span><b>{adults} adults · {children} children</b></div>
        <div><span>GUESTS</span><b>{totalGuests} total</b></div>
        <div><span>ROOMS</span><b>{rooms}</b></div>
        <div><span>ARRIVAL</span><b>{checkIn || "Not selected"}</b></div>
        <div><span>DEPARTURE</span><b>{checkOut || "Not selected"}</b></div>
      </div>
      <div className="stay-total"><span>{estimatedTotal == null ? "ROOM AMOUNT" : "INDICATIVE ROOM AMOUNT"}</span><strong>{estimatedTotal == null ? "To be quoted" : money(estimatedTotal, selectedRoom?.currency || "INR")}</strong></div>
      <p>{estimatedTotal == null ? "The hotel has not published a rate for this category yet. The team will confirm the amount in its response." : "Estimate uses the current admin-configured base rate only. Taxes and any optional additions are not included."}</p>
    </section>
    {dateError && <p className="form-note form-error" role="alert">Departure must be after arrival.</p>}
    <button className="dark-cta" type="submit" disabled={state === "sending" || dateError || !transactionalConsent}>{state === "sending" ? "SENDING…" : "SEND STAY ENQUIRY"} <span>↗</span></button>
    {message && state === "error" && <p className="form-note form-error" role="alert">{message}</p>}
    {showThanks && <ThankYouDialog title="Thank you for your request." message="Your stay enquiry and stay summary have reached our team. This is not a confirmed booking; the hotel will review availability and confirm the quotation." reference={reference} onClose={() => setShowThanks(false)} />}
    <p className="form-note">Your enquiry includes the selected room category, dates, nights, occupancy and indicative room amount. A manager must approve the request before payment and confirmation.</p>
  </form>;
}
