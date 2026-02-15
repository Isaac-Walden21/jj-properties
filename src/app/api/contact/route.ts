import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/contact";
import { formatContactFieldErrors } from "@/lib/validation/errors";
import { checkContactRateLimit } from "@/lib/rate-limit";
import { sendContactEmail } from "@/lib/email";
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

    // --- Send email ---
    const requestId = crypto.randomUUID();

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
