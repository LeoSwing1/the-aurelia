"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function CreateQuotation({id}:{id:string}){
 const router=useRouter();
 const [amount,setAmount]=useState("");const [validUntil,setValidUntil]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 async function submit(){setBusy(true);setNotice("");try{const r=await fetch(`/api/admin/events/${id}/quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:Number(amount),validUntil:validUntil||undefined,details:{currency:"INR"}})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Quotation failed.");setNotice(`Quotation v${d.quotation.version} created.`);router.refresh()}catch(e){setNotice(e instanceof Error?e.message:"Unable to create quotation.")}finally{setBusy(false)}}
 return <div className="approve-control"><input aria-label="Quotation amount in INR" type="number" min="1" step="0.01" placeholder="Quote amount ₹" value={amount} onChange={e=>setAmount(e.target.value)}/><input aria-label="Quotation valid until" type="date" value={validUntil} onChange={e=>setValidUntil(e.target.value)}/><button disabled={busy||!amount} onClick={submit}>{busy?"…":"Create quotation"}</button>{notice&&<small role="status">{notice}</small>}</div>
}
