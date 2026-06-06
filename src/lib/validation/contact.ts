import { z } from "zod";

const namePattern = /^[A-Za-z\s\-']+$/;

export const contactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or fewer")
    .regex(namePattern, "First name may only contain letters, spaces, and hyphens"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or fewer")
    .regex(namePattern, "Last name may only contain letters, spaces, and hyphens"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number must be 20 characters or fewer")
    .optional()
    .or(z.literal("")),
  inquiryType: z.enum(["buy", "sell", "invest", "general"], {
    message: "Please select an inquiry type",
  }),
  propertyInterest: z.string().optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(1000, "Message must be 1,000 characters or fewer"),
  honeypot: z.string().optional(),
  // Sell-a-property detail fields — shown/captured only when inquiryType === "sell".
  // Optional so buy/invest/general submissions still validate.
  sellAskingPrice: z.string().trim().max(200).optional().or(z.literal("")),
  sellCondition: z.string().trim().max(1000).optional().or(z.literal("")),
  sellWalkaway: z.string().trim().max(200).optional().or(z.literal("")),
  // Lead-source attribution (set by the client; not user-facing). Optional so
  // submissions without them still validate.
  sourcePage: z.string().max(512).optional().or(z.literal("")),
  sourceProperty: z.string().max(128).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;
