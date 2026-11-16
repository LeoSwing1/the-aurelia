"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Room={id:string;room_number:string;room_types?:{name:string}|null};
export function AssignRoom({reservationId,rooms}:{reservationId:string;rooms:Room[]}){
 const router=useRouter();
 const [roomId,setRoomId]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function assign(){setBusy(true);setMessage("");try{const response=await fetch(`/api/admin/reservations/${reservationId}/assign-room`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({roomId})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not assign room.");setMessage("Room assigned.");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Assignment failed.")}finally{setBusy(false)}}
 return <div className="approve-control"><select aria-label="Select physical room" value={roomId} onChange={e=>setRoomId(e.target.value)}><option value="">Assign physical room…</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.room_number} · {r.room_types?.name||"Room"}</option>)}</select><button type="button" disabled={!roomId||busy} onClick={assign}>{busy?"…":"Assign"}</button>{message&&<small role="status">{message}</small>}</div>
}
