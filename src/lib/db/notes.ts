import "server-only";
import { getDb } from "./index";
import type { InquiryNote } from "@/types/crm";

export function listNotes(inquiryId: number): InquiryNote[] {
  return getDb()
    .prepare(
      `SELECT n.*, u.username AS author_username
         FROM inquiry_notes n
         JOIN users u ON u.id = n.author_id
        WHERE n.inquiry_id = ?
        ORDER BY n.created_at ASC`
    )
    .all(inquiryId) as InquiryNote[];
}

export function createNote(inquiryId: number, authorId: number, body: string): InquiryNote {
  const id = Number(
    getDb()
      .prepare("INSERT INTO inquiry_notes (inquiry_id, author_id, body) VALUES (?, ?, ?)")
      .run(inquiryId, authorId, body).lastInsertRowid
  );
  return getDb()
    .prepare(
      `SELECT n.*, u.username AS author_username
         FROM inquiry_notes n JOIN users u ON u.id = n.author_id
        WHERE n.id = ?`
    )
    .get(id) as InquiryNote;
}
