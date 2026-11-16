import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
const schema=z.object({roomType:z.enum(["deluxe","executive"]),checkIn:z.iso.date(),checkOut:z.iso.date(),rooms:z.coerce.number().int().min(1).max(5).default(1)});
export async function GET(request:NextRequest){
 try{
  const p=schema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if(p.checkOut<=p.checkIn) return NextResponse.json({error:"Departure must be after arrival."},{status:400});
  const db=createAdminClient();const {data,error}=await db.rpc("check_room_availability",{p_room_type_code:p.roomType,p_check_in:p.checkIn,p_check_out:p.checkOut,p_quantity:p.rooms});
  if(error)throw error;return NextResponse.json(data);
 }catch(e){const m=e instanceof Error?e.message:"Availability check failed.";return NextResponse.json({error:m},{status:m.includes("not configured")?503:400})}
}
