import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { AdminLiveNotifications } from "@/components/admin-live-notifications";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } };
const nav=[
 ["Overview","/admin",["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION","FINANCE"]],
 ["Reservations","/admin/reservations",["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION","FINANCE"]],
 ["Rooms","/admin/rooms",["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION","HOUSEKEEPING"]],
 ["Events & Enquiries","/admin/events",["SUPER_ADMIN","GENERAL_MANAGER","EVENT_MANAGER","FINANCE"]],
 ["Finance","/admin/finance",["SUPER_ADMIN","GENERAL_MANAGER","FINANCE"]],
 ["Housekeeping","/admin/housekeeping",["SUPER_ADMIN","GENERAL_MANAGER","HOUSEKEEPING","RECEPTION"]],
 ["Staff & Access","/admin/staff",["SUPER_ADMIN","GENERAL_MANAGER"]],
 ["Notifications","/admin/notifications",["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION","EVENT_MANAGER","HOUSEKEEPING","FINANCE","RESTAURANT_STAFF"]],
 ["Schedule & Calendar","/admin/schedule",["SUPER_ADMIN","GENERAL_MANAGER","RECEPTION","EVENT_MANAGER","HOUSEKEEPING","FINANCE"]],
 ["Integrations","/admin/integrations",["SUPER_ADMIN","GENERAL_MANAGER"]],
 ["Settings","/admin/settings",["SUPER_ADMIN","GENERAL_MANAGER"]],
] as const;
export default async function AdminLayout({children}:{children:React.ReactNode}){
 if(!hasSupabase) return <main className="admin-main"><h1>Admin setup required</h1><p>Configure Supabase URL, publishable key and server-only service role key, then apply the database migration.</p><Link href="/staff-login">Staff sign in</Link></main>;
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/staff-login");
 const {data:profile}=await supabase.from("profiles").select("role,active,full_name").eq("id",user.id).single();
 if(!profile?.active)redirect("/staff-login?error=access");
 return <div className="admin-shell"><aside className="admin-side"><Link className="brand" href="/"><span className="admin-brand-mark">A</span><span>THE AURELIA<small>HOTEL &amp; RESORT</small></span></Link><div className="eyebrow" style={{padding:"0 12px 15px",color:"#9eaf9f"}}>MANAGEMENT PORTAL</div><nav className="admin-nav">{nav.filter(([, ,roles])=>(roles as readonly string[]).includes(profile.role)).map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</nav><p style={{fontSize:11,color:"#c5d0c8",margin:"35px 12px"}}>{profile.full_name||user.email}<br/>{profile.role}</p><form action="/api/auth/signout" method="post" style={{padding:"0 12px"}}><button className="admin-signout" type="submit">Sign out</button></form></aside><main className="admin-main"><div className="admin-main-toolbar"><span className="admin-live-status"><i/> LIVE DATABASE</span><AdminLiveNotifications /></div>{children}</main></div>;
}
