import { requireStaffRole } from "@/lib/auth/require-role";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export default async function Admin(){
 await requireStaffRole(["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION","FINANCE"]);
 const db=createAdminClient();
 const [reservations,pending,events,rooms,notifications,payments]=await Promise.all([
  db.from("reservations").select("id",{count:"exact",head:true}),
  db.from("reservations").select("id",{count:"exact",head:true}).eq("status","PENDING_APPROVAL"),
  db.from("event_enquiries").select("id",{count:"exact",head:true}).in("status",["NEW","CONTACTED","QUOTATION_SENT"]),
  db.from("rooms").select("id",{count:"exact",head:true}).eq("active",true),
  db.from("notifications").select("id,title,body,created_at,read_at").order("created_at",{ascending:false}).limit(8),
  db.from("payment_transactions").select("amount").eq("status","CAPTURED")
 ]);
 const paymentRows=(payments.data||[]) as Array<{amount:number|string|null}>;
 const revenue=paymentRows.reduce((sum:number,row)=>sum+Number(row.amount||0),0);
 const metrics=[["Reservations",reservations.count??0,"All booking channels"],["Pending approvals",pending.count??0,"Require manager review"],["Open event enquiries",events.count??0,"Awaiting follow-up"],["Physical rooms entered",rooms.count??0,"Of 42 category inventory"]];
 return <><div className="admin-top"><div><div className="section-kicker">HOTEL OPERATIONS</div><h1>Management overview</h1><p className="admin-lead">Live operating snapshot for The Aurelia.</p></div><span className="pill">LIVE DATABASE</span></div><div className="metric-grid">{metrics.map(m=><div className="metric" key={m[0]}><span>{m[0]}</span><strong>{m[1]}</strong><span>{m[2]}</span></div>)}<div className="metric"><span>Verified gateway collections</span><strong>₹{revenue.toLocaleString("en-IN")}</strong><span>Captured transactions only</span></div></div><div className="admin-dashboard-grid"><section className="panel"><div className="panel-heading"><h2>Recent notifications</h2><Link href="/admin/notifications" className="text-link">VIEW ALL ↗</Link></div>{notifications.error&&<p className="admin-lead">Notifications table is unavailable until the latest migration is applied.</p>}{(notifications.data||[]).length===0&&!notifications.error&&<p className="admin-lead">No notifications yet. New booking and enquiry activity will appear here.</p>}{((notifications.data||[]) as Array<{id:string;title:string;body:string;created_at:string;read_at:string|null}>).map(n=><article className="notification-row" key={n.id}><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString("en-IN")}{n.read_at?" · Read":" · Unread"}</small></article>)}</section><section className="panel"><h2>Quick actions</h2><div className="quick-links"><Link href="/admin/reservations">Review reservation requests ↗</Link><Link href="/admin/events">Manage event enquiries ↗</Link><Link href="/admin/rooms">Review room inventory ↗</Link><Link href="/admin/finance">View payment records ↗</Link><Link href="/admin/housekeeping">Open housekeeping ↗</Link><Link href="/admin/integrations">Configure integrations ↗</Link></div></section></div><section className="panel"><h2>Inventory overview</h2><p className="admin-lead">Current client brief: 40 Deluxe rooms and 2 Executive rooms. Enter verified physical room numbers under Room Inventory before assigning rooms to arriving guests.</p></section></>;
}
