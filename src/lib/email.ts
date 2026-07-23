import { Resend } from "resend";
import type { ContactInput } from "@/lib/validation/contact";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Sends the contact form submission as an email via Resend.
 */
export async function sendContactEmail(
  payload: ContactInput,
  requestId: string
) {
  const to = process.env.LEAD_TO_EMAIL;
  const from = process.env.LEAD_FROM_EMAIL;

  if (!to) {
    throw new Error("LEAD_TO_EMAIL environment variable is not set");
  }
  if (!from) {
    throw new Error("LEAD_FROM_EMAIL environment variable is not set");
  }

  const inquiryLabel = capitalize(payload.inquiryType);
  const subject = `[J & J Resort Properties] ${inquiryLabel} Inquiry`;

  const lines = [
    `Request ID: ${requestId}`,
    "",
    `Name: ${payload.firstName} ${payload.lastName}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "Not provided"}`,
    `Inquiry Type: ${inquiryLabel}`,
    `Property Interest: ${payload.propertyInterest || "None specified"}`,
  ];

  // Sell-a-property detail fields — only relevant for "sell" inquiries (TWE-132).
  if (payload.inquiryType === "sell") {
    lines.push(
      "",
      "Sell-a-Property Details:",
      `- Asking price: ${payload.sellAskingPrice || "Not provided"}`,
      `- Condition / deferred maintenance: ${payload.sellCondition || "Not provided"}`,
      `- Would be happy with: ${payload.sellWalkaway || "Not provided"}`
    );
  }

  lines.push("", "Message:", payload.message);

  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: payload.email,
    subject,
    text: lines.join("\n"),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
