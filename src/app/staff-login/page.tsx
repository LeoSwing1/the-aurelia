import { StaffLoginForm } from "@/components/staff-login-form";
export const metadata={title:"Staff sign in"};
export default function StaffLogin(){return <main className="staff-login"><div className="staff-login-card"><span className="eyebrow">THE AURELIA · STAFF PORTAL</span><h1>Welcome back.</h1><p>Sign in using the email and password created for you by hotel management in Supabase Authentication.</p><StaffLoginForm/></div></main>}
