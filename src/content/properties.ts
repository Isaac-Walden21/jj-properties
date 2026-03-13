import type { Property } from "@/types";
import {
  Wifi,
  Waves,
  Trees,
  Fish,
  Flame,
  Car,
  Anchor,
  Utensils,
  Snowflake,
  Coffee,
  Tv,
  MapPin,
  Mountain,
  TreePine,
  Building2,
  Star,
} from "lucide-react";

export const properties: Property[] = [
  {
    slug: "papins-resort",
    name: "Papin's Resort",
    tagline: "Where Lake Michigan meets the wild north",
    type: "resort",
    location: "Drummond, MI",
    description:
      "Nestled along the northern shores of Lake Michigan, Papin's Resort is a family-friendly waterfront destination that has welcomed guests for generations. Wake up to panoramic lake views, spend your days fishing, hiking nature trails, or simply unwinding by the campfire. With direct waterfront access and a private boat launch, Papin's is the quintessential Upper Peninsula escape.",
    highlights: [
      "Direct Lake Michigan waterfront with private beach access",
      "On-site boat launch for fishing and water recreation",
      "Scenic nature trails winding through undisturbed forest",
      "Campfire pits perfect for s'mores and stargazing",
      "Family-owned warmth with modern comforts",
    ],
    amenities: [
      { icon: Wifi, label: "Free Wi-Fi" },
      { icon: Waves, label: "Waterfront" },
      { icon: Trees, label: "Nature Trails" },
      { icon: Fish, label: "Fishing" },
      { icon: Flame, label: "Campfire Pits" },
      { icon: Car, label: "Boat Launch" },
    ],
    images: [
      {
        src: "/papins_resort.webp",
        alt: "Papin's Resort waterfront view on Lake Michigan",
        featured: true,
      },
      {
        src: "/images/properties/papins-resort/02.jpg",
        alt: "Papin's Resort cabin exterior",
      },
      {
        src: "/images/properties/papins-resort/03.jpg",
        alt: "Papin's Resort lakeside campfire area",
      },
    ],
    bookingUrl: "https://papinsresort.com",
    externalUrl: "https://papinsresort.com",
  },
  {
    slug: "island-view-resort",
    name: "Island View Resort",
    tagline: "Your window to the Les Cheneaux Islands",
    type: "resort",
    location: "Cedarville, MI",
    description:
      "Overlooking the pristine Les Cheneaux Islands, Island View Resort offers a charming retreat where the water meets the wilderness. Whether you're docking at the marina, casting a line at dawn, or settling in for a home-cooked meal, every moment here feels like a postcard. Winter brings its own magic with snowshoeing, ice fishing, and crisp evenings by the fire.",
    highlights: [
      "Stunning views of the Les Cheneaux Islands archipelago",
      "Full-service marina with boat slips and launch access",
      "On-site dining featuring locally sourced ingredients",
      "Year-round activities from fishing to snowshoeing",
      "Peaceful, small-town setting with genuine U.P. hospitality",
    ],
    amenities: [
      { icon: Wifi, label: "Free Wi-Fi" },
      { icon: Anchor, label: "Marina" },
      { icon: Trees, label: "Nature" },
      { icon: Fish, label: "Fishing" },
      { icon: Utensils, label: "Dining" },
      { icon: Snowflake, label: "Winter Activities" },
    ],
    images: [
      {
        src: "/island_view_resort.jpeg",
        alt: "Island View Resort overlooking the Les Cheneaux Islands",
        featured: true,
      },
      {
        src: "/images/properties/island-view-resort/02.jpg",
        alt: "Island View Resort marina at sunset",
      },
      {
        src: "/images/properties/island-view-resort/03.jpg",
        alt: "Island View Resort dining area",
      },
    ],
    bookingUrl: "https://ivr906.com",
    externalUrl: "https://ivr906.com",
  },
  {
    slug: "waterway-inn",
    name: "Waterway Inn",
    tagline: "Comfortable, dog-friendly lodging in Northern Michigan",
    type: "inn",
    location: "Indian River, MI",
    description:
      "Comfortable, affordable lodging steps from Northern Michigan's best trails, lakes, and outdoor recreation. The Waterway Inn is owner-operated, dog-friendly, and trail-adjacent — the perfect base camp for exploring the Inland Waterway region. Whether you're hiking, kayaking, snowmobiling, or just slowing down for a few days, you'll feel right at home.",
    highlights: [
      "Prime downtown Cedarville location on the waterway",
      "Walking distance to shops, dining, and local attractions",
      "Complimentary coffee and comfortable common areas",
      "Ideal home base for Les Cheneaux Islands exploration",
      "Seasonal charm with something to offer year-round",
    ],
    amenities: [
      { icon: Wifi, label: "Free Wi-Fi" },
      { icon: Coffee, label: "Complimentary Coffee" },
      { icon: Tv, label: "Cable TV" },
      { icon: Car, label: "Free Parking" },
      { icon: MapPin, label: "Downtown Location" },
      { icon: Snowflake, label: "Seasonal Activities" },
    ],
    images: [
      {
        src: "/waterway-inn.jpg",
        alt: "Waterway Inn along the Cedarville waterway",
        featured: true,
      },
      {
        src: "/images/properties/waterway-inn/02.jpg",
        alt: "Waterway Inn guest room interior",
      },
      {
        src: "/images/properties/waterway-inn/03.jpg",
        alt: "Waterway Inn waterway view from the porch",
      },
    ],
    bookingUrl: "https://waterwayinnir.com",
    externalUrl: "https://waterwayinnir.com",
  },
  {
    slug: "tahquamenon-suites",
    name: "Tahquamenon Suites",
    tagline: "Modern comfort at the edge of the wilderness",
    type: "suites",
    location: "Paradise, MI",
    description:
      "Just minutes from the thundering Tahquamenon Falls, Tahquamenon Suites delivers a modern lodging experience in the heart of the Upper Peninsula's most iconic landscape. Each suite features a kitchenette, smart TV, and everything you need for a comfortable extended stay. Step outside and you're surrounded by state parks, hiking trails, and some of the most breathtaking scenery in the Midwest.",
    highlights: [
      "Minutes from Tahquamenon Falls State Park",
      "Spacious suites with full kitchenettes and smart TVs",
      "Gateway to world-class hiking, paddling, and wildlife viewing",
      "Free parking with easy access to regional attractions",
      "Modern amenities in a rugged, natural setting",
    ],
    amenities: [
      { icon: Wifi, label: "Free Wi-Fi" },
      { icon: Mountain, label: "Near Falls" },
      { icon: Tv, label: "Smart TV" },
      { icon: Coffee, label: "Kitchenette" },
      { icon: Car, label: "Free Parking" },
      { icon: TreePine, label: "State Park Access" },
    ],
    images: [
      {
        src: "/tahquamenon_suites.jpeg",
        alt: "Tahquamenon Suites exterior near the falls",
        featured: true,
      },
      {
        src: "/images/properties/tahquamenon-suites/02.jpg",
        alt: "Tahquamenon Suites modern suite interior",
      },
      {
        src: "/images/properties/tahquamenon-suites/03.jpg",
        alt: "Tahquamenon Falls near the suites",
      },
    ],
    bookingUrl: "https://tahquamenonsuites.com",
    externalUrl: "https://tahquamenonsuites.com",
  },
  {
    slug: "cedarville-hotel",
    name: "Cedarville Hotel",
    tagline: "Historic charm in the heart of Cedarville",
    type: "hotel",
    location: "Cedarville, MI",
    description:
      "The Cedarville Hotel stands as a landmark in the heart of downtown Cedarville, blending its historic character with thoughtful, modern renovations. Recently updated while preserving its original charm, the hotel offers easy access to the marina, local restaurants, and the natural beauty of the Les Cheneaux region. Whether you're passing through or settling in for a week, the Cedarville Hotel is the cornerstone of a true U.P. experience.",
    highlights: [
      "Historic building with recent top-to-bottom renovation",
      "Central downtown location steps from marina and dining",
      "Character-rich architecture with modern guest comforts",
      "Gateway to the Les Cheneaux Islands and eastern U.P.",
      "A landmark property with decades of hospitality heritage",
    ],
    amenities: [
      { icon: Wifi, label: "Free Wi-Fi" },
      { icon: Building2, label: "Historic Building" },
      { icon: Utensils, label: "Restaurant Nearby" },
      { icon: Anchor, label: "Marina Access" },
      { icon: MapPin, label: "Downtown" },
      { icon: Star, label: "Recently Renovated" },
    ],
    images: [
      {
        src: "/cedarville_hotel.png",
        alt: "Cedarville Hotel historic exterior in downtown Cedarville",
        featured: true,
      },
      {
        src: "/images/properties/cedarville-hotel/02.jpg",
        alt: "Cedarville Hotel renovated lobby and common area",
      },
      {
        src: "/images/properties/cedarville-hotel/03.jpg",
        alt: "Cedarville Hotel guest room with modern finishes",
      },
    ],
    bookingUrl: "https://cedarvillehotel.com",
    externalUrl: "https://cedarvillehotel.com",
  },
];
