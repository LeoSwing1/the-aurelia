"use client";
import { useState } from "react";

type RoomType = { id: string; code: string; name: string; total_inventory: number; max_adults: number; max_children: number; base_rate: number | null; currency: string; active: boolean };

export function RoomCategoryManager({ initial }: { initial: RoomType[] }) {
  const [items, setItems] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, RoomType>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const edit = (item: RoomType) => setDrafts((old) => ({ ...old, [item.id]: { ...item } }));
  const change = (id: string, field: keyof RoomType, value: string | boolean) => setDrafts((old) => ({ ...old, [id]: { ...old[id], [field]: field === "name" ? value : field === "active" ? value : Number(value) } }));
  async function save(id: string) {
    const value = drafts[id]; if (!value) return;
    setBusy(id); setNotice("");
    try {
      const response = await fetch(`/api/admin/room-types/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value.name, base_rate: Number(value.base_rate || 0), total_inventory: Number(value.total_inventory), max_adults: Number(value.max_adults), max_children: Number(value.max_children), active: value.active }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save changes.");
      setItems((old) => old.map((item) => item.id === id ? result.roomType : item));
      setDrafts((old) => { const next = { ...old }; delete next[id]; return next; });
      setNotice(`${result.roomType.name} settings saved.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(null); }
  }
  return <section className="panel" style={{ marginBottom: 24 }}>
    <div className="panel-heading"><div><span className="eyebrow">MANAGE CATEGORIES</span><h2>Room names, prices & capacity</h2><p className="admin-lead">Changes here update the room category configuration. Prices are nightly base rates in INR.</p></div></div>
    {notice && <p role="status" className="form-success" style={{ margin: "12px 0" }}>{notice}</p>}
    <div className="admin-table-wrap"><table className="table"><thead><tr><th>Category name</th><th>Nightly base rate (₹)</th><th>Inventory</th><th>Adults</th><th>Children</th><th>Visible</th><th>Actions</th></tr></thead><tbody>
      {items.map((item) => { const value = drafts[item.id] || item; const editing = Boolean(drafts[item.id]); return <tr key={item.id}>
        <td>{editing ? <input aria-label="Room category name" value={value.name} onChange={(e) => change(item.id, "name", e.target.value)} className="admin-input" /> : <strong>{item.name}</strong>}<small style={{ display: "block", opacity: .65 }}>{item.code}</small></td>
        <td>{editing ? <input aria-label="Nightly base rate" type="number" min="0" step="100" value={value.base_rate ?? 0} onChange={(e) => change(item.id, "base_rate", e.target.value)} className="admin-input" /> : item.base_rate ? `₹${Number(item.base_rate).toLocaleString("en-IN")}` : "Not set"}</td>
        <td>{editing ? <input aria-label="Category inventory" type="number" min="0" value={value.total_inventory} onChange={(e) => change(item.id, "total_inventory", e.target.value)} className="admin-input small-input" /> : item.total_inventory}</td>
        <td>{editing ? <input aria-label="Maximum adults" type="number" min="1" value={value.max_adults} onChange={(e) => change(item.id, "max_adults", e.target.value)} className="admin-input small-input" /> : item.max_adults}</td>
        <td>{editing ? <input aria-label="Maximum children" type="number" min="0" value={value.max_children} onChange={(e) => change(item.id, "max_children", e.target.value)} className="admin-input small-input" /> : item.max_children}</td>
        <td>{editing ? <input aria-label="Category active" type="checkbox" checked={value.active} onChange={(e) => change(item.id, "active", e.target.checked)} /> : <span className="pill">{item.active ? "Active" : "Hidden"}</span>}</td>
        <td>{editing ? <div style={{ display: "flex", gap: 8 }}><button className="admin-action" disabled={busy === item.id} onClick={() => save(item.id)}>{busy === item.id ? "Saving…" : "Save"}</button><button className="admin-action secondary" onClick={() => setDrafts((old) => { const next = { ...old }; delete next[item.id]; return next; })}>Cancel</button></div> : <button className="admin-action" onClick={() => edit(item)}>Edit</button>}</td>
      </tr>; })}
      {!items.length && <tr><td colSpan={7}>No room categories found. Apply the Supabase migration first.</td></tr>}
    </tbody></table></div>
    <p className="admin-lead" style={{ marginTop: 14 }}>Only Super Admin and General Manager can change category settings. Existing bookings retain their saved booking totals; changing a base rate affects future pricing, not already approved reservations.</p>
  </section>;
}
