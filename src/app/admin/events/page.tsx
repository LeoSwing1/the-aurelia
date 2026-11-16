import { requireStaffRole } from "@/lib/auth/require-role";
import { CreateQuotation } from "@/components/create-quotation";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export default async function Events(){
 await requireStaffRole(["SUPER_ADMIN","GENERAL_MANAGER","EVENT_MANAGER","FINANCE"]);
 const db=createAdminClient();const {data,error}=await db.from("event_enquiries").select("*").order("created_at",{ascending:false}).limit(100);
 return <><div className="admin-top"><div><div className="eyebrow">EVENTS & SALES</div><h1>Event enquiries</h1><p className="admin-lead">Wedding and venue enquiries awaiting follow-up and quotation.</p></div><span className="pill">{data?.length??0} RECENT</span></div>
 {error&&<div className="note-panel">{error.message}</div>}
 <section className="panel"><div className="admin-table-wrap"><table className="table"><thead><tr><th>GUEST</th><th>EVENT</th><th>DATE</th><th>GUESTS</th><th>VENUE</th><th>STATUS</th><th>QUOTE</th></tr></thead><tbody>{(data||[]).map((r:any)=><tr key={r.id}><td>{r.guest_name}<br/><small>{r.guest_email}<br/>{r.guest_phone}</small></td><td>{r.event_type}</td><td>{r.event_date}</td><td>{r.guest_count}</td><td>{r.preferred_venue||"Not specified"}</td><td><span className="pill">{r.status}</span></td><td><CreateQuotation id={r.id}/></td></tr>)}</tbody></table></div></section></>;
}
