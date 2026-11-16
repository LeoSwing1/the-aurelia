import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export default async function Housekeeping(){
 await requireStaffRole(["SUPER_ADMIN","GENERAL_MANAGER","HOUSEKEEPING","RECEPTION"]);
 const db=createAdminClient();const {data,error}=await db.from("housekeeping_tasks").select("id,task_type,status,notes,due_at,rooms(room_number)").order("created_at",{ascending:false}).limit(100);
 return <><div className="admin-top"><div><div className="eyebrow">ROOM OPERATIONS</div><h1>Housekeeping</h1><p className="admin-lead">Daily cleaning, inspection and room readiness tasks.</p></div></div><section className="panel"><h2>Task board</h2>{error&&<p>{error.message}</p>}<div className="admin-table-wrap"><table className="table"><thead><tr><th>ROOM</th><th>TASK</th><th>STATUS</th><th>DUE</th><th>NOTES</th></tr></thead><tbody>{(data||[]).map((r:any)=><tr key={r.id}><td>{r.rooms?.room_number||"Unassigned"}</td><td>{r.task_type}</td><td><span className="pill">{r.status}</span></td><td>{r.due_at||"—"}</td><td>{r.notes||"—"}</td></tr>)}{!data?.length&&<tr><td colSpan={5}>No housekeeping tasks have been created.</td></tr>}</tbody></table></div></section></>;
}
