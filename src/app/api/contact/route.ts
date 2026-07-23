import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/contact";
import { formatContactFieldErrors } from "@/lib/validation/errors";
import { checkContactRateLimit } from "@/lib/rate-limit";
import { sendContactEmail, sendInquiryAck } from "@/lib/email";
import { createInquiry } from "@/lib/db/inquiries";
import type { ContactResponse } from "@/types";

function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    // --- Rate limiting ---
    const ip = getClientIp(request);
    if (!checkContactRateLimit(ip)) {
      return NextResponse.json<ContactResponse>(
        {
          ok: false,
          message:
            "Too many requests. Please wait a few minutes and try again.",
        },
        { status: 429 }
      );
    }

    // --- Parse body ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ContactResponse>(
        { ok: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    // --- Validate ---
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json<ContactResponse>(
        {
          ok: false,
          message: "Please fix the errors below and try again.",
          fieldErrors: formatContactFieldErrors(result.error),
        },
        { status: 400 }
      );
    }

    const data = result.data;

    // --- Honeypot check ---
    if (data.honeypot) {
      // Silently accept to not tip off bots, but do nothing
      return NextResponse.json<ContactResponse>({
        ok: true,
        message: "Thank you! We will be in touch shortly.",
      });
    }

    const requestId = crypto.randomUUID();

    // Lead source: client-provided fields first, then Referer path as a fallback.
    const referer = request.headers.get("referer");
    const sourcePage =
      data.sourcePage || (referer ? new URL(referer).pathname : null);
    const sourceProperty = data.sourceProperty || data.propertyInterest || null;

    // --- Persist to SQLite (best-effort: never blocks email send) ---
    try {
      createInquiry({
        request_id: requestId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone || null,
        inquiry_type: data.inquiryType,
        property_interest: data.propertyInterest || null,
        source_page: sourcePage,
        source_property: sourceProperty,
        message: data.message,
        sell_asking_price:
          data.inquiryType === "sell" ? data.sellAskingPrice || null : null,
        sell_condition:
          data.inquiryType === "sell" ? data.sellCondition || null : null,
        sell_walkaway:
          data.inquiryType === "sell" ? data.sellWalkaway || null : null,
      });
    } catch (dbErr) {
      console.error("[contact] DB insert failed:", dbErr);
    }

    // --- Send staff notification email ---
    try {
      await sendContactEmail(data, requestId);
    } catch (emailError) {
      console.error("[contact] Email send failed:", emailError);
      return NextResponse.json<ContactResponse>(
        {
          ok: false,
          message:
            "We could not send your message at this time. Please try again later.",
        },
        { status: 500 }
      );
    }

    // --- Auto-acknowledge the inquirer (best-effort) ---
    try {
      await sendInquiryAck(data);
    } catch (ackError) {
      console.error("[contact] Ack email failed:", ackError);
    }

    return NextResponse.json<ContactResponse>({
      ok: true,
      message: "Thank you! We will be in touch shortly.",
      requestId,
    });
  } catch (error) {
    console.error("[contact] Unexpected error:", error);
    return NextResponse.json<ContactResponse>(
      {
        ok: false,
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}
