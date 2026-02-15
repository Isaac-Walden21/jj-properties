import type { PageSEO } from "@/types";

export const seoByRoute: Record<string, PageSEO> = {
  "/": {
    title: "JJ Properties | Upper Peninsula Hospitality",
    description:
      "Five distinctive hotels, resorts, and inns across Michigan's Upper Peninsula. Explore waterfront getaways, historic lodging, and wilderness retreats with JJ Properties.",
    ogImage: "/images/og-default.jpg",
  },
  "/properties": {
    title: "Our Properties | JJ Properties",
    description:
      "Browse the JJ Properties portfolio — from lakefront resorts on Lake Michigan to cozy inns in Cedarville. Find your perfect Upper Peninsula getaway.",
    ogImage: "/images/og-default.jpg",
  },
  "/about": {
    title: "About Us | JJ Properties",
    description:
      "Meet Jack and Jeff, the team behind JJ Properties. Learn how their combined expertise in hospitality and real estate is shaping Upper Peninsula tourism.",
    ogImage: "/images/og-default.jpg",
  },
  "/sell": {
    title: "Sell Your Property | JJ Properties",
    description:
      "Considering selling your hospitality property in Michigan's Upper Peninsula? JJ Properties acquires hotels, resorts, and inns that align with our growing portfolio.",
    ogImage: "/images/og-default.jpg",
  },
  "/invest": {
    title: "Investment Opportunities | JJ Properties",
    description:
      "Partner with JJ Properties and invest in Upper Peninsula hospitality. Strategic opportunities in a growing tourism market with proven year-round demand.",
    ogImage: "/images/og-default.jpg",
  },
  "/contact": {
    title: "Contact Us | JJ Properties",
    description:
      "Get in touch with JJ Properties. Whether you're planning a visit, exploring a property sale, or interested in investment opportunities, we'd love to hear from you.",
    ogImage: "/images/og-default.jpg",
  },
  "/thank-you": {
    title: "Thank You | JJ Properties",
    description:
      "Thanks for reaching out to JJ Properties. We'll be in touch soon.",
    ogImage: "/images/og-default.jpg",
  },
  "/404": {
    title: "Page Not Found | JJ Properties",
    description:
      "The page you're looking for doesn't exist. Head back to JJ Properties to explore our Upper Peninsula hospitality portfolio.",
    ogImage: "/images/og-default.jpg",
  },

  // Per-property SEO
  "/properties/papins-resort": {
    title: "Papin's Resort — Naubinway, MI | JJ Properties",
    description:
      "Family-friendly waterfront resort on the shores of Lake Michigan in Naubinway. Fishing, nature trails, campfire pits, and private boat launch at Papin's Resort.",
    ogImage: "/images/og-default.jpg",
  },
  "/properties/island-view-resort": {
    title: "Island View Resort — Hessel, MI | JJ Properties",
    description:
      "Charming resort overlooking the Les Cheneaux Islands in Hessel. Marina access, on-site dining, fishing, and year-round activities at Island View Resort.",
    ogImage: "/images/og-default.jpg",
  },
  "/properties/waterway-inn": {
    title: "Waterway Inn — Cedarville, MI | JJ Properties",
    description:
      "Cozy inn along the scenic Cedarville waterway. Downtown location, complimentary coffee, and easy access to Les Cheneaux Islands exploration at Waterway Inn.",
    ogImage: "/images/og-default.jpg",
  },
  "/properties/tahquamenon-suites": {
    title: "Tahquamenon Suites — Newberry, MI | JJ Properties",
    description:
      "Modern suites minutes from Tahquamenon Falls in Newberry. Kitchenettes, smart TVs, free parking, and state park access at Tahquamenon Suites.",
    ogImage: "/images/og-default.jpg",
  },
  "/properties/cedarville-hotel": {
    title: "Cedarville Hotel — Cedarville, MI | JJ Properties",
    description:
      "Historic, recently renovated hotel in the heart of downtown Cedarville. Marina access, dining nearby, and Les Cheneaux Islands at your doorstep.",
    ogImage: "/images/og-default.jpg",
  },
};
