import { env } from "@/lib/env";
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
}
async function deliverEmail(to: string, subject: string, html: string) {
  if (!env.emailFrom) return { sent: false, reason: "Email sender not configured" };

  // Brevo is the primary transactional provider. Resend remains as a
  // backwards-compatible fallback until the Brevo key is configured.
  if (env.brevoApiKey) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey,
        "accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: env.emailFromName, email: env.emailFrom },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: html
          .replace(/<\s*br\s*\/?\s*>/gi, "\\n")
          .replace(/<\/p\s*>/gi, "\\n\\n")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim(),
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Brevo transactional email failed", response.status, detail.slice(0, 1000));
      throw new Error(`Brevo email provider returned ${response.status}`);
    }
    const result = await response.json() as { messageId?: string };
    return { sent: true, provider: "brevo", messageId: result.messageId };
  }

  if (env.resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${env.emailFromName} <${env.emailFrom}>`, to: [to], subject, html }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Resend email provider returned ${response.status}`);
    return { sent: true, provider: "resend" };
  }

  return { sent: false, reason: "Transactional email provider not configured" };
}
export async function sendHotelEmail(subject: string, html: string) {
  if (!env.hotelEmail) return { sent: false, reason: "Hotel notification email not configured" };
  return deliverEmail(env.hotelEmail, subject, html);
}
export async function sendGuestEmail(to: string, subject: string, html: string) {
  return deliverEmail(to, subject, html);
}
export async function sendWhatsAppText(to: string, body: string) {
  if (!env.whatsAppPhoneId || !env.whatsAppToken) return { sent: false, reason: "WhatsApp provider not configured" };
  const response = await fetch(`https://graph.facebook.com/${env.whatsAppVersion}/${env.whatsAppPhoneId}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${env.whatsAppToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body } }),
  });
  if (!response.ok) throw new Error(`WhatsApp provider returned ${response.status}`);
  return { sent: true };
}
export async function sendHotelWhatsAppAlert(body: string) {
  if (!env.whatsAppAlertTo) return { sent: false, reason: "Hotel WhatsApp alert recipient not configured" };
  return sendWhatsAppText(env.whatsAppAlertTo, body);
}

export async function sendGuestSMS(to: string, body: string) {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromNumber) return { sent: false, reason: "SMS provider not configured" };
  const auth = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: env.twilioFromNumber, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  return { sent: true };
}
