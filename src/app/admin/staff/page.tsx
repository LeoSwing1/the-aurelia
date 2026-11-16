import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
type StaffProfile = { id: string; full_name: string | null; role: string; active: boolean; phone: string | null; created_at: string };
export default async function Staff(){
 await requireStaffRole(["SUPER_ADMIN","GENERAL_MANAGER"]);
 const db=createAdminClient();const {data,error}=await db.from("profiles").select("id,full_name,role,active,phone,created_at").order("created_at",{ascending:false}).limit(100);
 return <><div className="admin-top"><div><div className="eyebrow">PEOPLE & PERMISSIONS</div><h1>Staff & access</h1><p className="admin-lead">Staff accounts are provisioned by an authorised administrator in Supabase Auth. Role assignment is never self-service.</p></div></div><section className="panel"><h2>Staff directory</h2>{error&&<p>{error.message}</p>}<div className="admin-table-wrap"><table className="table"><thead><tr><th>NAME</th><th>ROLE</th><th>PHONE</th><th>ACCESS</th></tr></thead><tbody>{((data || []) as StaffProfile[]).map((r)=><tr key={r.id}><td>{r.full_name}</td><td>{r.role}</td><td>{r.phone||"—"}</td><td><span className="pill">{r.active?"ACTIVE":"DISABLED"}</span></td></tr>)}</tbody></table></div></section></>;
}
