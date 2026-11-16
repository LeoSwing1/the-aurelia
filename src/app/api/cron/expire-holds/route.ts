import { NextRequest,NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`) return NextResponse.json({error:"Unauthorized"},{status:401});
 try{const db=createAdminClient();const {data,error}=await db.rpc("expire_reservation_holds");if(error)throw error;return NextResponse.json({ok:true,expired:data})}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Expiry job failed."},{status:500})}
}
