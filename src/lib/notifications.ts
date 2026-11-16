import { env } from "@/lib/env";
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
}
async function deliverEmail(to: string, subject: string, html: string) {
  if (!env.resendApiKey || !env.emailFrom) return { sent: false, reason: "Email provider not configured" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return { sent: true };
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
