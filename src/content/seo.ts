import type { PageSEO } from "@/types";

export const seoByRoute: Record<string, PageSEO> = {
  "/": {
    title: "JJ Resort Properties | Upper Peninsula Hospitality",
    description:
      "Five distinctive hotels, resorts, and inns across Michigan's Upper Peninsula. Explore waterfront getaways, historic lodging, and wilderness retreats with JJ Resort Properties.",
    ogImage: "/logo.png",
  },
  "/properties": {
    title: "Our Properties | JJ Resort Properties",
    description:
      "Browse the JJ Resort Properties portfolio — resorts, hotels, and inns across Michigan's Upper Peninsula. Find your perfect U.P. getaway.",
    ogImage: "/logo.png",
  },
  "/about": {
    title: "About Us | JJ Resort Properties",
    description:
      "Meet Jack and Jeff, the team behind JJ Resort Properties. Learn how their combined expertise in hospitality and real estate is shaping Upper Peninsula tourism.",
    ogImage: "/logo.png",
  },
  "/sell": {
    title: "Sell Your Property | JJ Resort Properties",
    description:
      "Considering selling your hospitality property in Michigan's Upper Peninsula? JJ Resort Properties acquires hotels, resorts, and inns that align with our growing portfolio.",
    ogImage: "/logo.png",
  },
  "/invest": {
    title: "Investment Opportunities | JJ Resort Properties",
    description:
      "Partner with JJ Resort Properties and invest in Upper Peninsula hospitality. Strategic opportunities in a growing tourism market with proven year-round demand.",
    ogImage: "/logo.png",
  },
  "/contact": {
    title: "Contact Us | JJ Resort Properties",
    description:
      "Get in touch with JJ Resort Properties. Whether you're planning a visit, exploring a property sale, or interested in investment opportunities, we'd love to hear from you.",
    ogImage: "/logo.png",
  },
  "/thank-you": {
    title: "Thank You | JJ Resort Properties",
    description:
      "Thanks for reaching out to JJ Resort Properties. We'll be in touch soon.",
    ogImage: "/logo.png",
  },
  "/404": {
    title: "Page Not Found | JJ Resort Properties",
    description:
      "The page you're looking for doesn't exist. Head back to JJ Resort Properties to explore our Upper Peninsula hospitality portfolio.",
    ogImage: "/logo.png",
  },
};
