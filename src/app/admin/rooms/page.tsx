import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { RoomCategoryManager } from "@/components/room-category-manager";
import { PhysicalRoomManager } from "@/components/physical-room-manager";
export const dynamic = "force-dynamic";
export default async function Rooms() {
  await requireStaffRole(["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION", "HOUSEKEEPING"]);
  const db = createAdminClient();
  const [{ data: types, error: typeError }, { data: rooms, error }] = await Promise.all([
    db.from("room_types").select("id,code,name,total_inventory,max_adults,max_children,base_rate,currency,active").order("name"),
    db.from("rooms").select("id,room_number,floor,room_type_id,status,active,room_types(name)").order("room_number").limit(500),
  ]);
  return <><div className="admin-top"><div><div className="eyebrow">FRONT DESK · INVENTORY</div><h1>Room inventory</h1><p className="admin-lead">Manage room category names, nightly base prices, inventory and occupancy limits. Physical room numbers are managed separately.</p></div></div>
    {typeError ? <section className="panel"><p>{typeError.message}</p></section> : <RoomCategoryManager initial={(types || []) as any} />}
    <div className="metric-grid">{((types || []) as Array<{id:string;name:string;total_inventory:number}>).map((t) => <div className="metric" key={t.id}><span>{t.name} category</span><strong>{t.total_inventory}</strong><span>Category inventory</span></div>)}</div>
    {error ? <section className="panel"><p>{error.message}</p></section> : <PhysicalRoomManager initial={(rooms || []) as any} categories={(types || []).map((t:any)=>({id:t.id,name:t.name}))} />}
  </>;
}
