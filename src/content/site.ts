export const site = {
  name: "J & J Resort Properties",
  tagline: "Northern Michigan Hospitality",
  siteUrl: "https://www.jjproperties.com",

  hero: {
    headline: "Experience Northern Michigan",
    subheadline:
      "Five properties across Northern Michigan — and we're always looking for the next one.",
    cta: { label: "Explore Properties", href: "/properties" },
    secondaryCta: { label: "Contact Us", href: "/contact" },
  },

  pages: {
    sell: {
      headline: "Sell Your Resort or Hotel",
      subheadline:
        "If you're looking to sell your resort or hotel in Northern Michigan, you've come to the right place. J & J Resort Properties specializes in acquiring hospitality properties across Northern Michigan.",
      cta: { label: "Get Your Offer", href: "/contact?type=sell" },
    },
    invest: {
      headline: "Partner with Us",
      subheadline:
        "Beyond every acquisition, we aim to cultivate long-term partnerships. Whether you're an investor, a hospitality professional, or someone who shares our vision for Northern Michigan, we'd love to explore how we can work together.",
      cta: { label: "Start a Conversation", href: "/contact?type=invest" },
    },
    about: {
      headline: "About J & J Resort Properties",
      subheadline:
        "Jeff and Jack are two cousins who left their corporate careers to combine their passions for real estate and Northern Michigan. What started with a single resort has grown into five distinctive properties across Northern Michigan.",
    },
    contact: {
      headline: "Get in Touch",
      subheadline:
        "Whether you're planning a trip, exploring a sale, or interested in investing, we'd love to hear from you.",
    },
  },
} as const;
