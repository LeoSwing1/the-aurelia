import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { sendGuestEmail, escapeHtml } from "@/lib/notifications";
const schema=z.object({amount:z.number().positive(),validUntil:z.iso.date().optional(),details:z.record(z.string(),z.unknown()).default({})});
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const session=await createClient();const {data:{user}}=await session.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {data:profile}=await session.from("profiles").select("role,active").eq("id",user.id).single();
  if(!profile?.active||!["SUPER_ADMIN","GENERAL_MANAGER","EVENT_MANAGER","FINANCE"].includes(profile.role))return NextResponse.json({error:"Not authorised."},{status:403});
  const payload=schema.parse(await request.json());const {id}=await params;const db=createAdminClient();
  const {data:existing,error:readError}=await db.from("event_quotations").select("version").eq("enquiry_id",id).order("version",{ascending:false}).limit(1);
  if(readError)throw readError;const version=(existing?.[0]?.version||0)+1;
  const {data,error}=await db.from("event_quotations").insert({enquiry_id:id,version,amount:payload.amount,valid_until:payload.validUntil||null,details:payload.details,status:"SENT",created_by:user.id}).select("*").single();
  if(error)throw error;
  const {data:enquiry}=await db.from("event_enquiries").select("guest_name,guest_email,event_type,event_date").eq("id",id).single();
  await db.from("event_enquiries").update({status:"QUOTATION_SENT",assigned_to:user.id}).eq("id",id);
  if(enquiry?.guest_email){try{await sendGuestEmail(enquiry.guest_email,"Your event quotation | The Aurelia",`<p>Dear ${escapeHtml(enquiry.guest_name)},</p><p>A quotation for your ${escapeHtml(enquiry.event_type)} enquiry has been prepared.</p><p>Quotation amount: <strong>INR ${Number(payload.amount).toLocaleString("en-IN")}</strong></p><p>Valid until: ${escapeHtml(payload.validUntil||"To be confirmed by the hotel")}</p><p>Please contact the hotel team to discuss and accept the quotation. Your event is not confirmed until availability and the agreed payment terms are completed.</p>`)}catch(mailError){console.error("Event quotation email failed",mailError)}}
  return NextResponse.json({ok:true,quotation:data},{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not create quotation."},{status:400})}
}
