"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function StaffLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "access") setError("Your sign-in was accepted, but this account has no active hotel staff profile. Ask the administrator to verify your profile role and active status in Supabase.");
    if (params.get("error") === "forbidden") setError("Your account is signed in, but it does not have permission to open that section.");
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: String(fd.get("email") || "").trim(), password: String(fd.get("password") || "") });
      if (authError) {
        const normalised = authError.message.toLowerCase();
        if (normalised.includes("invalid login credentials") || normalised.includes("invalid_credentials")) {
          throw new Error("Supabase did not recognise this email and password. First create this user in Supabase → Authentication → Users, then set or reset its password and try again.");
        }
        if (normalised.includes("email not confirmed")) {
          throw new Error("This staff account's email is not confirmed. Confirm it in Supabase Authentication → Users, or disable email confirmation only if hotel management has approved that setup.");
        }
        throw authError;
      }
      if (!data.user) throw new Error("Supabase did not return a signed-in user. Please try again.");
      // The server-side admin guard checks the staff profile and role after sign-in.
      router.replace("/admin"); router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check the email and password, then try again.");
    } finally { setBusy(false); }
  }
  return <form className="staff-login-form" onSubmit={submit}>
    <label>Email<input name="email" type="email" required autoComplete="username" /></label>
    <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
    <button className="dark-cta" disabled={busy}>{busy ? "SIGNING IN…" : "SIGN IN"}</button>
    {error && <p className="staff-login-error" role="alert">{error}</p>}
  </form>;
}
