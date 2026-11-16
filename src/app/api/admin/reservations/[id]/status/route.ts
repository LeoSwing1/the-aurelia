import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
const schema=z.object({status:z.enum(["CHECKED_IN","CHECKED_OUT","CANCELLED","NO_SHOW"])});
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const session=await createClient();const {data:{user}}=await session.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {data:profile}=await session.from("profiles").select("role,active").eq("id",user.id).single();
  if(!profile?.active||!["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION"].includes(profile.role))return NextResponse.json({error:"Not authorised."},{status:403});
  const {status}=schema.parse(await request.json());const {id}=await params;const db=createAdminClient();
  const {data,error}=await db.rpc("transition_reservation_status",{p_reservation_id:id,p_new_status:status,p_actor:user.id});if(error)throw error;
  return NextResponse.json({ok:true,...data});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Status update failed."},{status:400});}
}
