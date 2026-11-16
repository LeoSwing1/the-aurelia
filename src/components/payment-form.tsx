"use client";
import { useState } from "react";
declare global { interface Window { Razorpay?: new (options: Record<string,unknown>)=>{open:()=>void}; } }
export function PaymentForm(){
 const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
 async function pay(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setNotice("");
  const fd=new FormData(e.currentTarget);
  try{
   const response=await fetch("/api/payments/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bookingReference:String(fd.get("reference")||""),email:String(fd.get("email")||"")})});
   const order=await response.json();if(!response.ok)throw new Error(order.error||"Could not create payment order.");
   if(!window.Razorpay){
    await new Promise<void>((resolve,reject)=>{const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.onload=()=>resolve();script.onerror=()=>reject(new Error("Payment checkout could not load."));document.body.appendChild(script);});
   }
   const RazorpayCheckout=window.Razorpay;
   if(!RazorpayCheckout)throw new Error("Payment checkout is unavailable.");
   const checkout=new RazorpayCheckout({key:order.keyId,amount:order.amount,currency:order.currency,name:"The Aurelia Hotel & Resort",description:`Reservation ${order.reservationReference}`,order_id:order.orderId,prefill:{email:String(fd.get("email")||"")},theme:{color:"#20372d"},handler:()=>setNotice("Payment submitted. The hotel will confirm your reservation after the payment provider's signed webhook verifies the payment.")});
   checkout.open();
  }catch(err){setNotice(err instanceof Error?err.message:"Unable to start payment.")}finally{setBusy(false)}
 }
 return <form className="enquiry-form" onSubmit={pay}><div className="form-grid"><label className="full-field">BOOKING REFERENCE<input required name="reference" placeholder="AUR-XXXXXXXXXX"/></label><label className="full-field">BOOKING EMAIL<input required type="email" name="email" placeholder="Email used for reservation"/></label></div><button className="dark-cta" disabled={busy}>{busy?"PREPARING…":"CONTINUE TO SECURE PAYMENT"} ↗</button>{notice&&<p role="status" className="form-note">{notice}</p>}<p className="form-note">Payment is available only after manager approval and within the 24-hour payment window. Use the exact booking email and reference.</p></form>
}
