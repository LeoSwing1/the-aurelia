"use client";
import { useState } from "react";
import { ThankYouDialog } from "@/components/thank-you-dialog";
type FormState="idle"|"sending"|"success"|"error";
export function EnquiryForm({kind="General enquiry"}:{kind?:string}){
 const [state,setState]=useState<FormState>("idle");const [notice,setNotice]=useState("");const [showThanks,setShowThanks]=useState(false);
 const isEvent=kind.toLowerCase().includes("wedding")||kind.toLowerCase().includes("banquet")||kind.toLowerCase().includes("event")||kind.toLowerCase().includes("conference");
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const formElement=e.currentTarget;setState("sending");setNotice("");const form=new FormData(formElement);
  const payload={name:String(form.get("name")||""),email:String(form.get("email")||""),phone:String(form.get("phone")||""),eventType:String(form.get("type")||"Other"),eventDate:String(form.get("eventDate")||""),guests:Number(form.get("guests")||1),venue:String(form.get("venue")||""),message:String(form.get("message")||"")};
  try{const response=await fetch(isEvent?"/api/events":"/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(isEvent?payload:{name:payload.name,email:payload.email,phone:payload.phone,message:payload.message,kind})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to submit enquiry.");setState("success");setNotice(result.message||"Your enquiry has been received.");setShowThanks(true);formElement.reset();}
  catch(error){setState("error");setNotice(error instanceof Error?error.message:"Something went wrong. Please try again.");}
 }
 const today=new Date();const minDate=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
 return <form className="enquiry-form" onSubmit={submit}>
  <div className="form-grid">
   <label>YOUR NAME<input required name="name" autoComplete="name" minLength={2} maxLength={120} placeholder="Full name"/></label>
   <label>EMAIL ADDRESS<input required type="email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com"/></label>
   <label>PHONE NUMBER<input required type="tel" name="phone" autoComplete="tel" minLength={7} maxLength={24} placeholder="Contact number"/></label>
   <label>ENQUIRY TYPE<select name="type" defaultValue={kind.toLowerCase().includes("wedding")?"Wedding":kind.toLowerCase().includes("banquet")?"Banquet":kind.toLowerCase().includes("conference")?"Conference":"Other"}><option>Wedding</option><option>Banquet</option><option>Conference</option><option>Social event</option><option>Other</option></select></label>
   {isEvent&&<><label>EVENT DATE<input required type="date" name="eventDate" min={minDate}/></label><label>EXPECTED GUESTS<input required type="number" name="guests" min="1" max="5000" defaultValue="100"/></label><label className="full-field">PREFERRED VENUE<input name="venue" maxLength={120} placeholder="e.g. Poolside garden"/></label></>}
   <label className="full-field">HOW CAN WE HELP?<textarea name="message" rows={4} maxLength={3000} placeholder="Tell us about your plans"/></label>
  </div>
  <button className="dark-cta" type="submit" disabled={state==="sending"}>{state==="sending"?"SENDING…":"SUBMIT ENQUIRY"} <span>↗</span></button>
  {state==="error"&&notice&&<p className="form-note form-error" role="alert">{notice}</p>}
  {showThanks&&<ThankYouDialog title="Thank you for reaching out." message={notice||"Your enquiry has been received. The Aurelia team will get in touch with you."} onClose={()=>setShowThanks(false)}/>}
  <p className="form-note">{isEvent?"Event requests begin with an enquiry. The events team will check venue availability and prepare a quotation; submitting this form does not confirm an event.":"Your message will be sent securely to the hotel team. We will contact you using the details provided."}</p>
 </form>;
}
