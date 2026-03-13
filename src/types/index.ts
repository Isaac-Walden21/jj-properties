export interface Property {
  slug: string;
  name: string;
  tagline: string;
  type: "resort" | "hotel" | "inn" | "suites";
  location: string;
  image: { src: string; alt: string };
  bookingUrl?: string;
  externalUrl?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

export interface ContactRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  inquiryType: "buy" | "sell" | "invest" | "general";
  propertyInterest?: string;
  message: string;
  honeypot?: string;
}

export interface ContactResponse {
  ok: boolean;
  message: string;
  requestId?: string;
  fieldErrors?: Partial<Record<keyof ContactRequest, string>>;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface PageSEO {
  title: string;
  description: string;
  ogImage: string;
}
