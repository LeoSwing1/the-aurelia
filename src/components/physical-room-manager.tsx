"use client";
import { useState } from "react";

type Category = { id: string; name: string };
type Room = { id: string; room_number: string; floor: string | null; room_type_id: string; status: string; active: boolean; room_types?: { name: string } | null };
const statuses = ["AVAILABLE", "DIRTY", "CLEANING", "INSPECTED", "MAINTENANCE", "INACTIVE"];

export function PhysicalRoomManager({ initial, categories }: { initial: Room[]; categories: Category[] }) {
  const [rooms, setRooms] = useState(initial);
  const [draft, setDraft] = useState({ room_number: "", floor: "", room_type_id: categories[0]?.id || "", status: "AVAILABLE", active: true });
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [values, setValues] = useState<Record<string, typeof draft>>({});

  async function save(id?: string) {
    setBusy(true); setMessage("");
    try {
      const value = id ? values[id] : draft;
      const response = await fetch(id ? `/api/admin/rooms/${id}` : "/api/admin/rooms", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, floor: value.floor || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save room.");
      const room = { ...result.room, room_types: { name: categories.find(c => c.id === result.room.room_type_id)?.name || "" } };
      setRooms(old => id ? old.map(r => r.id === id ? room : r) : [...old, room].sort((a,b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true })));
      if (id) { setEditing(null); setValues(old => { const next={...old}; delete next[id]; return next; }); }
      else setDraft({ room_number: "", floor: "", room_type_id: categories[0]?.id || "", status: "AVAILABLE", active: true });
      setMessage(id ? "Room updated." : "Physical room added.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); }
    finally { setBusy(false); }
  }
  return <section className="panel" style={{ marginTop: 24 }}>
    <div className="panel-heading"><div><span className="eyebrow">PHYSICAL INVENTORY</span><h2>Individual room records</h2><p className="admin-lead">Add actual room numbers, floors and housekeeping states. Only Super Admin and General Manager can change these records.</p></div></div>
    {message && <p role="status" className="form-success">{message}</p>}
    <div className="admin-table-wrap"><table className="table"><thead><tr><th>Room number</th><th>Floor</th><th>Category</th><th>Status</th><th>Active</th><th>Action</th></tr></thead><tbody>
      {rooms.map(room => { const v=values[room.id] || {room_number:room.room_number,floor:room.floor||"",room_type_id:room.room_type_id,status:room.status,active:room.active}; const isEdit=editing===room.id; return <tr key={room.id}>
        <td>{isEdit?<input className="admin-input" value={v.room_number} onChange={e=>setValues(o=>({...o,[room.id]:{...v,room_number:e.target.value}}))}/>:room.room_number}</td>
        <td>{isEdit?<input className="admin-input" value={v.floor} onChange={e=>setValues(o=>({...o,[room.id]:{...v,floor:e.target.value}}))}/>:room.floor||"—"}</td>
        <td>{isEdit?<select className="admin-input" value={v.room_type_id} onChange={e=>setValues(o=>({...o,[room.id]:{...v,room_type_id:e.target.value}}))}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>:room.room_types?.name||"—"}</td>
        <td>{isEdit?<select className="admin-input" value={v.status} onChange={e=>setValues(o=>({...o,[room.id]:{...v,status:e.target.value}}))}>{statuses.map(s=><option key={s}>{s}</option>)}</select>:<span className="pill">{room.status}</span>}</td>
        <td>{isEdit?<input type="checkbox" checked={v.active} onChange={e=>setValues(o=>({...o,[room.id]:{...v,active:e.target.checked}}))}/>:room.active?"Yes":"No"}</td>
        <td>{isEdit?<button className="admin-action" disabled={busy} onClick={()=>save(room.id)}>Save</button>:<button className="admin-action secondary" onClick={()=>{setEditing(room.id);setValues(o=>({...o,[room.id]:v}));}}>Edit</button>}</td>
      </tr>; })}
      <tr><td><input className="admin-input" placeholder="e.g. 101" value={draft.room_number} onChange={e=>setDraft(v=>({...v,room_number:e.target.value}))}/></td><td><input className="admin-input" placeholder="e.g. Ground" value={draft.floor} onChange={e=>setDraft(v=>({...v,floor:e.target.value}))}/></td><td><select className="admin-input" value={draft.room_type_id} onChange={e=>setDraft(v=>({...v,room_type_id:e.target.value}))}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></td><td><select className="admin-input" value={draft.status} onChange={e=>setDraft(v=>({...v,status:e.target.value}))}>{statuses.map(s=><option key={s}>{s}</option>)}</select></td><td><input type="checkbox" checked={draft.active} onChange={e=>setDraft(v=>({...v,active:e.target.checked}))}/></td><td><button className="admin-action" disabled={busy||!draft.room_number.trim()||!draft.room_type_id} onClick={()=>save()}>Add room</button></td></tr>
    </tbody></table></div>
  </section>;
}
