import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
export async function middleware(request:NextRequest){return updateSession(request);}
// Cron and webhook endpoints authenticate with their own secrets/signatures, so they skip the Supabase session refresh.
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|manifest.webmanifest|robots.txt|sitemap.xml|api/cron|api/payments/razorpay-webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
