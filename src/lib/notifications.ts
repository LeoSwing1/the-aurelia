
import { env } from "@/lib/env";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] ?? character;
  });
}

/**
 * Convert HTML into a readable plain-text email fallback.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\/\s*h[1-6]\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

type EmailResult =
  | {
      sent: true;
      provider: "brevo" | "resend";
      messageId?: string;
    }
  | {
      sent: false;
      reason: string;
    };

async function deliverEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  if (!env.emailFrom) {
    return {
      sent: false,
      reason: "Email sender not configured",
    };
  }

  if (env.brevoApiKey) {
    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "api-key": env.brevoApiKey,
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: env.emailFromName,
            email: env.emailFrom,
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: htmlToText(html),
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error("BREVO_EMAIL_FAILED", {
        status: response.status,
        recipient: to,
        subject,
        detail: detail.slice(0, 1000),
      });

      throw new Error(
        `Brevo email provider returned ${response.status}`
      );
    }

    const result = (await response.json()) as {
      messageId?: string;
    };

    return {
      sent: true,
      provider: "brevo",
      messageId: result.messageId,
    };
  }

  if (env.resendApiKey) {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${env.emailFromName} <${env.emailFrom}>`,
          to: [to],
          subject,
          html,
          text: htmlToText(html),
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error("RESEND_EMAIL_FAILED", {
        status: response.status,
        recipient: to,
        subject,
        detail: detail.slice(0, 1000),
      });

      throw new Error(
        `Resend email provider returned ${response.status}`
      );
    }

    const result = (await response.json()) as {
      id?: string;
    };

    return {
      sent: true,
      provider: "resend",
      messageId: result.id,
    };
  }

  return {
    sent: false,
    reason: "Transactional email provider not configured",
  };
}

export async function sendHotelEmail(
  subject: string,
  html: string
): Promise<EmailResult> {
  if (!env.hotelEmail) {
    return {
      sent: false,
      reason: "Hotel notification email not configured",
    };
  }

  return deliverEmail(env.hotelEmail, subject, html);
}

export async function sendGuestEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  return deliverEmail(to, subject, html);
}

/**
 * WhatsApp Cloud API
 */
export async function sendWhatsAppText(
  to: string,
  body: string
) {
  if (!env.whatsAppPhoneId || !env.whatsAppToken) {
    return {
      sent: false,
      reason: "WhatsApp provider not configured",
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${env.whatsAppVersion}/${env.whatsAppPhoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsAppToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();

    console.error("WHATSAPP_SEND_FAILED", {
      status: response.status,
      detail: detail.slice(0, 1000),
    });

    throw new Error(
      `WhatsApp provider returned ${response.status}`
    );
  }

  return { sent: true };
}

export async function sendHotelWhatsAppAlert(body: string) {
  if (!env.whatsAppAlertTo) {
    return {
      sent: false,
      reason: "Hotel WhatsApp alert recipient not configured",
    };
  }

  return sendWhatsAppText(env.whatsAppAlertTo, body);
}

/**
 * Twilio SMS
 */
export async function sendGuestSMS(
  to: string,
  body: string
) {
  if (
    !env.twilioAccountSid ||
    !env.twilioAuthToken ||
    !env.twilioFromNumber
  ) {
    return {
      sent: false,
      reason: "SMS provider not configured",
    };
  }

  const auth = Buffer.from(
    `${env.twilioAccountSid}:${env.twilioAuthToken}`
  ).toString("base64");

  const params = new URLSearchParams({
    To: to,
    From: env.twilioFromNumber,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  if (!response.ok) {
    const detail = await response.text();

    console.error("TWILIO_SMS_FAILED", {
      status: response.status,
      detail: detail.slice(0, 1000),
    });

    throw new Error(
      `SMS provider returned ${response.status}`
    );
  }

  return { sent: true };
}
