import "server-only";
import { getDb } from "./index";
import type { Inquiry, InquiryFilters, InquiryStatus } from "@/types/crm";

interface InquiryRow extends Omit<Inquiry, "is_read"> {
  is_read: number;
}

function toInquiry(row: InquiryRow): Inquiry {
  return { ...row, is_read: row.is_read === 1 };
}

export function createInquiry(input: {
  request_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  inquiry_type: string;
  property_interest: string | null;
  source_page: string | null;
  source_property: string | null;
  message: string;
}): number {
  const stmt = getDb().prepare(
    `INSERT INTO inquiries
       (request_id, first_name, last_name, email, phone, inquiry_type,
        property_interest, source_page, source_property, message)
     VALUES
       (@request_id, @first_name, @last_name, @email, @phone, @inquiry_type,
        @property_interest, @source_page, @source_property, @message)`
  );
  return Number(stmt.run(input).lastInsertRowid);
}

export function listInquiries(filters: InquiryFilters): Inquiry[] {
  const where: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status && filters.status !== "all") {
    where.push("status = @status");
    params.status = filters.status;
  }
  if (filters.type && filters.type !== "all") {
    where.push("inquiry_type = @type");
    params.type = filters.type;
  }
  if (filters.property && filters.property !== "all") {
    where.push("property_interest = @property");
    params.property = filters.property;
  }
  if (filters.q) {
    where.push(
      "(first_name LIKE @q COLLATE NOCASE OR last_name LIKE @q COLLATE NOCASE OR email LIKE @q COLLATE NOCASE)"
    );
    params.q = `%${filters.q}%`;
  }

  const sql =
    `SELECT * FROM inquiries` +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    ` ORDER BY created_at DESC LIMIT 200`;

  return (getDb().prepare(sql).all(params) as InquiryRow[]).map(toInquiry);
}

export function getInquiry(id: number): Inquiry | null {
  const row = getDb().prepare("SELECT * FROM inquiries WHERE id = ?").get(id) as
    | InquiryRow
    | undefined;
  return row ? toInquiry(row) : null;
}

export function updateInquiry(
  id: number,
  patch: { status?: InquiryStatus; is_read?: boolean }
): void {
  const sets: string[] = [];
  const params: Record<string, string | number> = { id };
  if (patch.status !== undefined) {
    sets.push("status = @status");
    params.status = patch.status;
  }
  if (patch.is_read !== undefined) {
    sets.push("is_read = @is_read");
    params.is_read = patch.is_read ? 1 : 0;
  }
  if (!sets.length) return;
  getDb().prepare(`UPDATE inquiries SET ${sets.join(", ")} WHERE id = @id`).run(params);
}
