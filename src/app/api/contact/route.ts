import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHotelEmail, sendGuestEmail, escapeHtml } from "@/lib/notifications";
const schema=z.object({name:z.string().min(2).max(120),email:z.email(),phone:z.string().min(7).max(24),message:z.string().max(3000),kind:z.string().max(80).default("General enquiry")});
export async function POST(request:NextRequest){
 try{
  const p=schema.parse(await request.json()); const db=createAdminClient();
  const {data,error}=await db.from("contact_enquiries").insert({guest_name:p.name,guest_email:p.email,guest_phone:p.phone,enquiry_type:p.kind,message:p.message}).select("id").single();
  if(error) throw error;
  try{await sendHotelEmail("New website enquiry",`<p>${escapeHtml(p.name)} · ${escapeHtml(p.email)} · ${escapeHtml(p.phone)}</p><p>${escapeHtml(p.kind)}</p><p>${escapeHtml(p.message)}</p>`); await sendGuestEmail(p.email,"We received your message | The Aurelia",`<p>Dear ${escapeHtml(p.name)},</p><p>Thank you for contacting The Aurelia Hotel & Resort. Your message has been received by our team.</p>`)}catch(e){console.error(e)}
  return NextResponse.json({ok:true,id:data.id,message:"Your enquiry has been sent to the hotel team."},{status:201});
 }catch(e){const m=e instanceof Error?e.message:"Unable to submit";return NextResponse.json({error:m.includes("not configured")?"Online enquiries are not activated yet. Please contact the hotel.":m},{status:m.includes("not configured")?503:400})}
}
