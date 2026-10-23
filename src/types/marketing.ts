/**
 * Domain types for the email marketing system.
 *
 * Same conventions as src/types/crm.ts: snake_case fields mirroring the
 * columns, and booleans typed as `boolean` even though SQLite stores 0/1 --
 * the *Row interfaces below carry the raw integers, and a toX() mapper in the
 * data-access layer converts. Keeping both shapes means the integer never
 * escapes src/lib/db.
 */

export type ContactSource = "inquiry" | "import" | "manual";
export type TagKind = "manual" | "import" | "computed";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "done" | "paused";
export type MessageKind = "marketing" | "transactional";
export type MessageStatus = "sent" | "suppressed" | "failed";
export type CampaignSendStatus = "pending" | "sent" | "suppressed";

/**
 * Every kind of row that can appear in marketing_events.
 *
 * The four in the first group are what suppression is derived from. Note
 * `email_bounced_transient` is deliberately NOT one of them: a full mailbox or
 * a greylisting should not permanently delete a real guest from the list. The
 * reference implementation suppresses on every bounce; this is a considered
 * divergence, and the transient events are still recorded and shown on the
 * contact timeline.
 */
export type MarketingEventKind =
  // suppression signals
  | "opt_out"
  | "email_unsub"
  | "email_bounced"
  | "email_complaint"
  // recorded, but do not suppress
  | "email_bounced_transient"
  | "email_sent"
  | "email_delivered"
  | "email_opened"
  | "email_clicked"
  // provenance
  | "inquiry"
  | "imported";

/**
 * Why a send did not happen.
 *
 * A closed union rather than free text on purpose: these strings are written to
 * campaign_sends.reason and then GROUP BY'd to build the "Suppressed, why"
 * panel. Free text would fragment that panel the first time someone reworded a
 * message.
 */
export type SuppressionReason =
  | "opted out"
  | "no email"
  | "email suppressed (bounce/complaint)"
  | "email unsubscribed"
  | "quiet hours"
  | "frequency cap (1 marketing email per 7 days)"
  | "duplicate send blocked"
  | "unresolved prior attempt";

export interface Contact {
  id: number;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  source: ContactSource;
  consent_note: string | null;
  consent_at: string;
  is_test: boolean;
  created_at: string;
  updated_at: string;
}

/** Raw row shape: SQLite has no boolean, so is_test arrives as 0 or 1. */
export interface ContactRow extends Omit<Contact, "is_test"> {
  is_test: number;
}

/**
 * A contact plus the derived state the send gate needs.
 *
 * Built by getContactView from probes into marketing_events and messages, not
 * read from a column -- there is no stored suppression flag to fall out of date.
 * `lastMarketingSentMs` is mutated in memory by performSend after a successful
 * marketing send, so the frequency cap holds within a single batch as well as
 * across ticks.
 */
export interface ContactView {
  id: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  optedOut: boolean;
  emailSuppressed: boolean;
  emailUnsubbed: boolean;
  lastMarketingSentMs: number | null;
}

/** A contacts-list row: the contact, plus its tags and suppression badges. */
export interface ContactListRow extends Contact {
  tags: string[];
  opted_out: boolean;
  email_suppressed: boolean;
  email_unsubbed: boolean;
}

export interface ContactTag {
  tag: string;
  kind: TagKind;
  created_at: string;
}

export interface MarketingEvent {
  id: number;
  contact_id: number | null;
  campaign_id: number | null;
  kind: MarketingEventKind;
  dedup_key: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

/** Raw row shape: payload is TEXT holding JSON. */
export interface MarketingEventRow extends Omit<MarketingEvent, "payload"> {
  payload: string;
}

export interface Message {
  id: number;
  contact_id: number;
  campaign_id: number | null;
  channel: "email";
  direction: "out";
  kind: MessageKind;
  subject: string | null;
  body: string;
  provider_id: string | null;
  status: MessageStatus;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  channel: "email";
  segment: SegmentDef;
  subject: string;
  body: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** Raw row shape: segment is TEXT holding JSON. */
export interface CampaignRow extends Omit<Campaign, "segment"> {
  segment: string;
}

export interface CampaignListRow {
  id: number;
  name: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_at: string;
  sent: number;
  suppressed: number;
  pending: number;
}

export interface CampaignSend {
  campaign_id: number;
  contact_id: number;
  status: CampaignSendStatus;
  reason: SuppressionReason | string | null;
  sent_at: string | null;
}

/**
 * A campaign's audience, as declarative JSON.
 *
 * Deliberately reshaped from the reference, whose filters were all revenue
 * shaped (minBookings, minLtvCents, bookedWithinDays). J&J has inquiries and no
 * bookings, so those have no data to stand on and are replaced by the equivalents
 * that do.
 *
 * parseSegment rejects unknown keys. That guard matters more than it looks: a
 * typoed filter that is silently ignored broadens a campaign to every contact,
 * which is the worst failure this system has.
 */
export interface SegmentDef {
  /** Contact must carry ALL of these tags. */
  tagsAll?: string[];
  sourceAny?: ContactSource[];
  /** Joins back to the inquiries table by email. */
  inquiryTypeAny?: ("buy" | "sell" | "invest" | "general")[];
  /** Property slugs from src/content/properties.ts. */
  propertyAny?: string[];
  createdWithinDays?: number;
  /** Mutually exclusive with neverEmailed. */
  notEmailedWithinDays?: number;
  neverEmailed?: boolean;
  /** Forced on by withChannel: v1 is email-only. */
  hasEmail?: boolean;
}

export interface ContactFilters {
  q?: string;
  tag?: string;
  source?: string;
  /** "all" | "mailable" | "suppressed" */
  state?: string;
}
