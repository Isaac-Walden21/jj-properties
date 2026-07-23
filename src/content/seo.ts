import type { PageSEO } from "@/types";

export const seoByRoute: Record<string, PageSEO> = {
  "/": {
    title: "J & J Resort Properties | Upper Peninsula Hospitality",
    description:
      "Five distinctive hotels, resorts, and inns across Michigan's Upper Peninsula. Explore waterfront getaways, historic lodging, and wilderness retreats with J & J Resort Properties.",
    ogImage: "/logo.png",
  },
  "/properties": {
    title: "Our Properties | J & J Resort Properties",
    description:
      "Browse the J & J Resort Properties portfolio — resorts, hotels, and inns across Michigan's Upper Peninsula. Find your perfect U.P. getaway.",
    ogImage: "/logo.png",
  },
  "/about": {
    title: "About Us | J & J Resort Properties",
    description:
      "Meet Jack and Jeff, the team behind J & J Resort Properties. Learn how their combined expertise in hospitality and real estate is shaping Upper Peninsula tourism.",
    ogImage: "/logo.png",
  },
  "/sell": {
    title: "Sell Your Property | J & J Resort Properties",
    description:
      "Considering selling your hospitality property in Michigan's Upper Peninsula? J & J Resort Properties acquires hotels, resorts, and inns that align with our growing portfolio.",
    ogImage: "/logo.png",
  },
  "/invest": {
    title: "Investment Opportunities | J & J Resort Properties",
    description:
      "Partner with J & J Resort Properties and invest in Upper Peninsula hospitality. Strategic opportunities in a growing tourism market with proven year-round demand.",
    ogImage: "/logo.png",
  },
  "/contact": {
    title: "Contact Us | J & J Resort Properties",
    description:
      "Get in touch with J & J Resort Properties. Whether you're planning a visit, exploring a property sale, or interested in investment opportunities, we'd love to hear from you.",
    ogImage: "/logo.png",
  },
  "/thank-you": {
    title: "Thank You | J & J Resort Properties",
    description:
      "Thanks for reaching out to J & J Resort Properties. We'll be in touch soon.",
    ogImage: "/logo.png",
  },
  "/404": {
    title: "Page Not Found | J & J Resort Properties",
    description:
      "The page you're looking for doesn't exist. Head back to J & J Resort Properties to explore our Upper Peninsula hospitality portfolio.",
    ogImage: "/logo.png",
  },
};
