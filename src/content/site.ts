export const site = {
  name: "JJ Properties",
  tagline: "Upper Peninsula Hospitality",
  siteUrl: "https://www.jjproperties.com",

  hero: {
    headline: "Experience Michigan's Upper Peninsula",
    subheadline:
      "Five distinctive properties across the U.P. — from lakefront resorts to historic inns. Your next great escape starts here.",
    cta: { label: "Explore Properties", href: "/properties" },
    secondaryCta: { label: "Contact Us", href: "/contact" },
  },

  pages: {
    sell: {
      headline: "Sell Your Property",
      subheadline:
        "Thinking of selling your hospitality property in the Upper Peninsula? We acquire well-positioned hotels, resorts, and inns that align with our portfolio. Let's talk about what your property is worth.",
      cta: { label: "Start a Conversation", href: "/contact?type=sell" },
    },
    invest: {
      headline: "Invest with JJ Properties",
      subheadline:
        "Partner with an experienced hospitality team that knows the Upper Peninsula market. We offer strategic investment opportunities in a growing tourism region with proven demand and year-round appeal.",
      cta: { label: "Learn More", href: "/contact?type=invest" },
    },
    about: {
      headline: "About JJ Properties",
      subheadline:
        "Jack and Jeff built JJ Properties on a shared belief: the Upper Peninsula deserves world-class hospitality. With five properties and counting, we are committed to preserving the character of the U.P. while delivering memorable guest experiences.",
    },
    contact: {
      headline: "Get in Touch",
      subheadline:
        "Whether you're planning a trip, exploring a sale, or interested in investing, we'd love to hear from you.",
    },
  },
} as const;
