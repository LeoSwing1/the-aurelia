import { requireStaffRole } from "@/lib/auth/require-role";
import { env, hasSupabase } from "@/lib/env";
export const dynamic="force-dynamic";
const item=(label:string,ready:boolean,detail:string)=>({label,ready,detail});
export default async function Settings(){
 await requireStaffRole(["SUPER_ADMIN","GENERAL_MANAGER"]);
 const settings=[
  item("Supabase database and server access",hasSupabase,"Configured through Supabase URL, publishable key and server-only service-role key."),
  item("Production website URL",Boolean(process.env.NEXT_PUBLIC_SITE_URL&&process.env.NEXT_PUBLIC_SITE_URL.startsWith("https://")),"Set NEXT_PUBLIC_SITE_URL to the verified production domain."),
  item("Razorpay payments",Boolean(env.razorpayKeyId&&env.razorpayKeySecret&&env.razorpayWebhookSecret),"Configure test credentials first, then verify signed webhooks before live mode."),
  item("Email delivery",Boolean(env.resendApiKey&&env.emailFrom&&env.hotelEmail),"Configure Resend API key, verified sender and hotel notification inbox."),
  item("WhatsApp alerts",Boolean(env.whatsAppPhoneId&&env.whatsAppToken&&env.whatsAppAlertTo),"Configure Meta WhatsApp Cloud API credentials and approved recipient/template policy."),
  item("Automated hold expiry",Boolean(process.env.CRON_SECRET),"Configure CRON_SECRET and a scheduler for /api/cron/expire-holds."),
 ];
 return <><div className="admin-top"><div><div className="eyebrow">PLATFORM CONFIGURATION</div><h1>System settings</h1><p className="admin-lead">Sensitive provider settings are managed in local environment files and Vercel project settings, not in browser forms.</p></div></div><section className="panel"><h2>Configuration checklist</h2>{settings.map(s=><div className="settings-row" key={s.label}><div><strong>{s.label}</strong><p>{s.detail}</p></div><span className="pill">{s.ready?"CONFIGURED":"NEEDS SETUP"}</span></div>)}</section><div className="note-panel"><strong>Do not share secrets</strong><p>This screen intentionally displays readiness only. It never reads or displays secret values. Update credentials in the secure environment-variable settings for your local development environment or Vercel project.</p></div></>;
}
