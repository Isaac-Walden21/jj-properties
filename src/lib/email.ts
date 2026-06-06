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
 * Provider-agnostic sender. Dispatches by EMAIL_PROVIDER:
 * - "ses"  → Amazon SES (From = SES_FROM_EMAIL)
 * - else   → Resend     (From = LEAD_FROM_EMAIL)
 */
async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<void> {
  if (process.env.EMAIL_PROVIDER === "ses") {
    const from = process.env.SES_FROM_EMAIL;
    if (!from) {
      throw new Error("SES_FROM_EMAIL environment variable is not set");
    }
    const { sendEmailViaSes } = await import("./email-ses");
    await sendEmailViaSes({
      to: args.to,
      from,
      subject: args.subject,
      text: args.text,
      html: args.html,
      replyTo: args.replyTo,
    });
    return;
  }

  // Resend (default)
  const from = process.env.LEAD_FROM_EMAIL;
  if (!from) {
    throw new Error("LEAD_FROM_EMAIL environment variable is not set");
  }
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    replyTo: args.replyTo,
    subject: args.subject,
    text: args.text,
    ...(args.html ? { html: args.html } : {}),
  });
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Sends the contact form submission as a staff notification email.
 */
export async function sendContactEmail(payload: ContactInput, requestId: string) {
  const to = process.env.LEAD_TO_EMAIL;
  if (!to) {
    throw new Error("LEAD_TO_EMAIL environment variable is not set");
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

  await sendEmail({
    to,
    subject,
    text: lines.join("\n"),
    replyTo: payload.email,
  });
}

/**
 * Auto-acknowledgement sent to the inquirer after they submit the form.
 */
export async function sendInquiryAck(data: ContactInput): Promise<void> {
  const subject = "We received your message · JJ Properties";
  const text = `Hi ${data.firstName},\n\nThanks for reaching out to JJ Properties — we've received your message and will be in touch shortly.\n\n— JJ Properties`;
  const html = `<p>Hi ${data.firstName},</p><p>Thanks for reaching out to JJ Properties — we've received your message and will be in touch shortly.</p><p>— JJ Properties</p>`;
  await sendEmail({ to: data.email, subject, html, text });
}

/**
 * Password-reset link emailed to a staff account.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const subject = "Reset your JJ Properties admin password";
  const text = `Use this link to reset your password (valid 30 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;
  const html = `<p>Use this link to reset your password (valid 30 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`;
  await sendEmail({ to, subject, html, text });
}
