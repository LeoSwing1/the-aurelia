import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendGuestEmail, sendHotelWhatsAppAlert, escapeHtml } from "@/lib/notifications";
const schema=z.object({totalAmount:z.number().positive(),pricingBreakdown:z.record(z.string(),z.unknown()).optional(),frontDeskNotes:z.string().max(2000).optional()});
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const session=await createClient();const {data:{user}}=await session.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {data:profile}=await session.from("profiles").select("role,active").eq("id",user.id).single();if(!profile?.active||!["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION","FINANCE"].includes(profile.role))return NextResponse.json({error:"Not authorised."},{status:403});
  const input=schema.parse(await request.json());const {id}=await params;const db=createAdminClient();
  const {data,error}=await db.rpc("approve_reservation_detailed",{p_reservation_id:id,p_total_amount:input.totalAmount,p_actor:user.id,p_pricing_breakdown:input.pricingBreakdown||{},p_front_desk_notes:input.frontDeskNotes||null});if(error)throw error;
  const {data:reservation}=await db.from("reservations").select("booking_reference,payment_expires_at,guests(full_name,email)").eq("id",id).single();const guest=Array.isArray(reservation?.guests)?reservation?.guests[0]:reservation?.guests;
  if(guest?.email){try{await sendGuestEmail(guest.email,"Your Aurelia stay request is approved — payment required",`<p>Dear ${escapeHtml(guest.full_name||"Guest")},</p><p>Your reservation request <strong>${escapeHtml(reservation?.booking_reference||id)}</strong> has been approved.</p><p>Please complete full payment within 24 hours to confirm your stay.</p><p><a href="${env.siteUrl}/pay">Continue to secure payment</a></p><p>Payment deadline: ${escapeHtml(reservation?.payment_expires_at||"")}</p><p>Your reservation is not confirmed until payment is verified.</p>`)}catch(mailError){console.error("Approval email failed",mailError)}}
  try{await sendHotelWhatsAppAlert(`Reservation ${reservation?.booking_reference||id} approved. Guest must complete full payment within 24 hours.`)}catch(alertError){console.error("Approval WhatsApp alert failed",alertError)}
  return NextResponse.json({ok:true,...data});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Approval failed."},{status:400})}
}
