import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
const schema=z.object({roomId:z.uuid()});
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const session=await createClient();const {data:{user}}=await session.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {data:profile}=await session.from("profiles").select("role,active").eq("id",user.id).single();
  if(!profile?.active||!["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION"].includes(profile.role))return NextResponse.json({error:"Not authorised."},{status:403});
  const {roomId}=schema.parse(await request.json());const {id}=await params;const db=createAdminClient();
  const {data,error}=await db.rpc("assign_reservation_room",{p_reservation_id:id,p_room_id:roomId,p_actor:user.id});
  if(error)throw error;return NextResponse.json({ok:true,assignmentId:data});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Room assignment failed."},{status:400});}
}
