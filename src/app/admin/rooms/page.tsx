import { requireStaffRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { RoomCategoryManager } from "@/components/room-category-manager";
import { PhysicalRoomManager } from "@/components/physical-room-manager";
export const dynamic = "force-dynamic";
type RoomCategory = { id: string; code: string; name: string; total_inventory: number; max_adults: number; max_children: number; base_rate: number | null; currency: string; active: boolean };
type PhysicalRoom = { id: string; room_number: string; floor: string | null; room_type_id: string; status: string; active: boolean; room_types: { name: string } | null };
type PhysicalRoomQueryRow = Omit<PhysicalRoom, "room_types"> & { room_types: { name: string } | { name: string }[] | null };
function normalizePhysicalRooms(input: unknown): PhysicalRoom[] {
  const source = Array.isArray(input) ? input : [];
  const result: PhysicalRoom[] = [];
  for (const value of source) {
    if (!value || typeof value !== "object") continue;
    const row = value as PhysicalRoomQueryRow;
    const relation = Array.isArray(row.room_types) ? row.room_types[0] ?? null : row.room_types;
    if (!relation || typeof row.id !== "string" || typeof row.room_number !== "string") continue;
    result.push({ ...row, room_types: relation });
  }
  return result;
}
export default async function Rooms() {
  await requireStaffRole(["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION", "HOUSEKEEPING"]);
  const db = createAdminClient();
  const [{ data: types, error: typeError }, { data: rooms, error }] = await Promise.all([
    db.from("room_types").select("id,code,name,total_inventory,max_adults,max_children,base_rate,currency,active").order("name"),
    db.from("rooms").select("id,room_number,floor,room_type_id,status,active,room_types(name)").order("room_number").limit(500),
  ]);
  const physicalRooms = normalizePhysicalRooms(rooms);
  return <><div className="admin-top"><div><div className="eyebrow">FRONT DESK · INVENTORY</div><h1>Room inventory</h1><p className="admin-lead">Manage room category names, nightly base prices, inventory and occupancy limits. Physical room numbers are managed separately.</p></div></div>
    {typeError ? <section className="panel"><p>{typeError.message}</p></section> : <RoomCategoryManager initial={(types || []) as RoomCategory[]} />}
    <div className="metric-grid">{((types || []) as RoomCategory[]).map((t) => <div className="metric" key={t.id}><span>{t.name} category</span><strong>{t.total_inventory}</strong><span>Category inventory</span></div>)}</div>
    {error ? <section className="panel"><p>{error.message}</p></section> : <PhysicalRoomManager initial={physicalRooms} categories={((types || []) as RoomCategory[]).map((t)=>({id:t.id,name:t.name}))} />}
  </>;
}
