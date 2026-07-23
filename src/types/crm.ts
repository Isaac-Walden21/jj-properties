export type InquiryStatus = "new" | "contacted" | "closed";
export type InquiryType = "buy" | "sell" | "invest" | "general";
export type UserRole = "admin" | "staff";

export interface Inquiry {
  id: number;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  inquiry_type: InquiryType;
  property_interest: string | null;
  source_page: string | null;
  source_property: string | null;
  message: string;
  // Sell-a-property detail fields (only set when inquiry_type === "sell")
  sell_asking_price: string | null;
  sell_condition: string | null;
  sell_walkaway: string | null;
  status: InquiryStatus;
  is_read: boolean;
  request_id: string;
}

export interface InquiryNote {
  id: number;
  inquiry_id: number;
  author_id: number;
  author_username: string; // joined from users
  body: string;
  created_at: string;
}

export interface StaffUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
  added_by: number | null;
}

export interface InquiryFilters {
  status?: string;
  type?: string;
  property?: string;
  q?: string;
}
