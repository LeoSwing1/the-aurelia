import { createAdminClient } from "@/lib/supabase/admin";
import { ApproveReservation } from "@/components/approve-reservation";
import { AssignRoom } from "@/components/assign-room";
import { ReservationStatusActions } from "@/components/reservation-status-actions";
import { requireStaffRole } from "@/lib/auth/require-role";
export const dynamic="force-dynamic";
type Guest = { full_name: string | null; email: string | null; phone: string | null };
type RoomType = { id: string; name: string; base_rate: number | string | null };
type ReservationRow = { id: string; booking_reference: string; check_in: string; check_out: string; room_quantity: number; adults: number; children: number; status: string; payment_status: string; total_amount: number | string | null; currency: string | null; source: string | null; special_requests: string | null; created_at: string; payment_expires_at: string | null; pricing_breakdown: unknown; front_desk_notes: string | null; guests: Guest | Guest[] | null; room_types: RoomType | RoomType[] | null };
type AvailableRoom = { id: string; room_number: string; room_types: { name: string } | { name: string }[] | null };
type AssignableRoom = { id: string; room_number: string; room_types: { name: string } };
function normalizeAssignableRooms(input: unknown, targetRoomTypeName: string | undefined): AssignableRoom[] {
 const source = Array.isArray(input) ? input : [];
 const result: AssignableRoom[] = [];
 for (const value of source) {
  if (!value || typeof value !== "object") continue;
  const item = value as { id?: unknown; room_number?: unknown; room_types?: unknown };
  const relation = Array.isArray(item.room_types) ? item.room_types[0] : item.room_types;
  if (!relation || typeof relation !== "object") continue;
  const name = (relation as { name?: unknown }).name;
  if (typeof item.id !== "string" || typeof item.room_number !== "string" || typeof name !== "string") continue;
  if (targetRoomTypeName && name !== targetRoomTypeName) continue;
  result.push({ id: item.id, room_number: item.room_number, room_types: { name } });
 }
 return result;
}
type PaymentRow = { reservation_id: string; provider: string; provider_order_id: string | null; provider_payment_id: string | null; amount: number | string; currency: string; status: string; created_at: string };
export default async function Reservations(){
 await requireStaffRole(["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION","FINANCE"]);
 const db=createAdminClient();
 const [{data,error},{data:rooms},{data:payments}]=await Promise.all([
  db.from("reservations").select("id,booking_reference,check_in,check_out,room_quantity,adults,children,status,payment_status,total_amount,currency,source,special_requests,created_at,payment_expires_at,pricing_breakdown,front_desk_notes,guests(full_name,email,phone),room_types(name,id,base_rate)").order("created_at",{ascending:false}).limit(150),
  db.from("rooms").select("id,room_number,room_types(name)").eq("active",true).in("status",["AVAILABLE","INSPECTED"]).order("room_number"),
  db.from("payment_transactions").select("reservation_id,provider,provider_order_id,provider_payment_id,amount,currency,status,created_at").order("created_at",{ascending:false}).limit(200)
 ]);
 const rows = (data || []) as ReservationRow[];const count=(s:string)=>rows.filter(r=>r.status===s).length;const paid=rows.filter(r=>r.payment_status==="PAID").reduce((s,r)=>s+Number(r.total_amount||0),0);
 const paymentRows = (payments || []) as PaymentRow[];
 return <><div className="admin-top"><div><div className="eyebrow">FRONT DESK · GUEST OPERATIONS</div><h1>Reservations</h1><p className="admin-lead">A complete working view for guest arrivals, stay pricing, approval, payment reconciliation and room allocation.</p></div><span className="pill">{rows.length} RECENT</span></div>
 <div className="metric-grid frontdesk-metrics"><div className="metric"><span>Awaiting review</span><strong>{count("PENDING_APPROVAL")}</strong><small>New website requests</small></div><div className="metric"><span>Payment holds</span><strong>{count("AWAITING_PAYMENT")}</strong><small>Approved · payment pending</small></div><div className="metric"><span>Confirmed stays</span><strong>{count("CONFIRMED")+count("CHECKED_IN")}</strong><small>Paid reservations</small></div><div className="metric"><span>Recorded paid value</span><strong>₹{paid.toLocaleString("en-IN")}</strong><small>From paid reservations</small></div></div>
 {error&&<div className="note-panel">Unable to load reservations: {error.message}</div>}
 <section className="panel"><div className="panel-heading"><div><h2>Guest reservation register</h2><p className="admin-lead">Expand a reservation to review the guest request, price the stay and complete front-desk actions.</p></div><span className="pill">LATEST {rows.length}</span></div><div className="admin-table-wrap"><table className="table frontdesk-table"><thead><tr><th>REFERENCE / GUEST</th><th>STAY DETAILS</th><th>ROOM</th><th>RESERVATION</th><th>PAYMENT</th><th>FRONT DESK ACTION</th></tr></thead><tbody>{rows.map((r)=>{const guest=Array.isArray(r.guests)?r.guests[0]:r.guests;const room=Array.isArray(r.room_types)?r.room_types[0]:r.room_types;const nights=Math.max(0,Math.round((new Date(`${r.check_out}T00:00:00`).getTime()-new Date(`${r.check_in}T00:00:00`).getTime())/86400000));const tx=paymentRows.filter(p=>p.reservation_id===r.id);return <tr key={r.id}><td><strong>{r.booking_reference}</strong><br/><b>{guest?.full_name||"Guest"}</b><br/><small>{guest?.email}<br/>{guest?.phone}</small><br/><small>Source: {r.source||"WEBSITE"}</small></td><td><b>{r.check_in}</b><br/>to {r.check_out}<br/><small>{nights} night(s) · {r.adults} adults · {r.children} children</small>{r.special_requests&&<details className="frontdesk-request"><summary>Guest requests</summary><p>{r.special_requests}</p></details>}</td><td>{room?.name||"—"}<br/>{r.room_quantity} room(s)</td><td><span className="pill">{r.status?.replaceAll("_"," ")}</span><br/><small>{new Date(r.created_at).toLocaleString("en-IN")}</small></td><td><b>{r.payment_status}</b><br/>{r.total_amount?`${r.currency||"INR"} ${Number(r.total_amount).toLocaleString("en-IN")}`:"Not priced"}<br/><small>{tx.length} gateway record(s)</small>{r.payment_expires_at&&r.status==="AWAITING_PAYMENT"&&<small>Due: {new Date(r.payment_expires_at).toLocaleString("en-IN")}</small>}</td><td><div className="frontdesk-actions">{r.status==="PENDING_APPROVAL"?<ApproveReservation id={r.id} checkIn={r.check_in} checkOut={r.check_out} roomQuantity={r.room_quantity} roomName={room?.name||"Room"} adults={r.adults} childCount={r.children} guestName={guest?.full_name||"Guest"} defaultRate={room?.base_rate==null?null:Number(room.base_rate)}/>:r.status==="CONFIRMED"||r.status==="CHECKED_IN"?<><AssignRoom reservationId={r.id} rooms={normalizeAssignableRooms(rooms, room?.name)}/><ReservationStatusActions id={r.id} status={r.status}/></>:<span>—</span>}</div></td></tr>})}{!rows.length&&<tr><td colSpan={6}>No reservation requests have been submitted yet.</td></tr>}</tbody></table></div></section>
 <section className="panel"><h2>Recent gateway activity</h2><div className="admin-table-wrap"><table className="table"><thead><tr><th>BOOKING</th><th>PROVIDER</th><th>ORDER / PAYMENT REFERENCE</th><th>AMOUNT</th><th>GATEWAY STATUS</th></tr></thead><tbody>{paymentRows.slice(0,12).map((p,i)=><tr key={`${p.provider_order_id||p.provider_payment_id||i}`}><td>{rows.find(r=>r.id===p.reservation_id)?.booking_reference||"—"}</td><td>{p.provider}</td><td>{p.provider_order_id||"—"}<br/><small>{p.provider_payment_id||"Payment not captured"}</small></td><td>{p.currency} {Number(p.amount).toLocaleString("en-IN")}</td><td><span className="pill">{p.status}</span></td></tr>)}{!paymentRows.length&&<tr><td colSpan={5}>No payment gateway transactions have been recorded yet.</td></tr>}</tbody></table></div></section>
 <p className="admin-lead">Operational rules: room assignment is allowed only after payment-confirmed reservation status. Physical room overlaps are blocked by the database. A pending request is not a confirmed booking.</p></>;
}
