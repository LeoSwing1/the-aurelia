"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function ReservationStatusActions({id,status}:{id:string;status:string}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
 const next=status==="CONFIRMED"?"CHECKED_IN":status==="CHECKED_IN"?"CHECKED_OUT":null;
 async function update(target:string){setBusy(true);setNotice("");try{const response=await fetch(`/api/admin/reservations/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:target})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Status update failed.");setNotice(`${target.replaceAll("_"," ")} updated.`);router.refresh();}catch(e){setNotice(e instanceof Error?e.message:"Update failed.")}finally{setBusy(false)}}
 return <div className="approve-control">{next&&<button type="button" disabled={busy} onClick={()=>update(next)}>{busy?"…":next.replaceAll("_"," ")}</button>}{status==="CONFIRMED"&&<button type="button" disabled={busy} onClick={()=>update("CANCELLED")}>Cancel</button>}{notice&&<small role="status">{notice}</small>}</div>;
}
