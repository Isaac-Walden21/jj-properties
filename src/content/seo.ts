import type { PageSEO } from "@/types";

export const seoByRoute: Record<string, PageSEO> = {
  "/": {
    title: "J & J Resort Properties | Northern Michigan Hospitality",
    description:
      "Five distinctive hotels, resorts, and inns across Northern Michigan. Explore waterfront getaways, historic lodging, and wilderness retreats with J & J Resort Properties.",
    ogImage: "/og-image.png",
  },
  "/properties": {
    title: "Our Properties | J & J Resort Properties",
    description:
      "Browse the J & J Resort Properties portfolio — resorts, hotels, and inns across Northern Michigan. Find your perfect U.P. getaway.",
    ogImage: "/og-image.png",
  },
  "/about": {
    title: "About Us | J & J Resort Properties",
    description:
      "Meet Jack and Jeff, the team behind J & J Resort Properties. Learn how their combined expertise in hospitality and real estate is shaping Northern Michigan tourism.",
    ogImage: "/og-image.png",
  },
  "/sell": {
    title: "Sell Your Property | J & J Resort Properties",
    description:
      "Considering selling your hospitality property in Northern Michigan? J & J Resort Properties acquires hotels, resorts, and inns that align with our growing portfolio.",
    ogImage: "/og-image.png",
  },
  "/invest": {
    title: "Investment Opportunities | J & J Resort Properties",
    description:
      "Partner with J & J Resort Properties and invest in Northern Michigan hospitality. Strategic opportunities in a growing tourism market with proven year-round demand.",
    ogImage: "/og-image.png",
  },
  "/contact": {
    title: "Contact Us | J & J Resort Properties",
    description:
      "Get in touch with J & J Resort Properties. Whether you're planning a visit, exploring a property sale, or interested in investment opportunities, we'd love to hear from you.",
    ogImage: "/og-image.png",
  },
  "/thank-you": {
    title: "Thank You | J & J Resort Properties",
    description:
      "Thanks for reaching out to J & J Resort Properties. We'll be in touch soon.",
    ogImage: "/og-image.png",
  },
  "/404": {
    title: "Page Not Found | J & J Resort Properties",
    description:
      "The page you're looking for doesn't exist. Head back to J & J Resort Properties to explore our Northern Michigan hospitality portfolio.",
    ogImage: "/og-image.png",
  },
};
