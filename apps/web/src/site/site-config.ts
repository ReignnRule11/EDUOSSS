import type { ContactInfo, NavItem, SocialLinks } from "./types";

export const siteConfig = {
  name: "Bright Future Academy",
  shortName: "BFA",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Nurturing Excellence, Inspiring Tomorrow",
  description:
    "Bright Future Academy is a forward-thinking school delivering academic excellence, character development and innovation from early years to senior secondary.",
  logo: "/site/logo.svg",
  navItems: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Admissions", href: "/admissions" },
    { label: "Academics", href: "/academics" },
    { label: "Gallery", href: "/gallery" },
    { label: "News", href: "/news" },
    { label: "Events", href: "/events" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ] satisfies NavItem[],
  contact: {
    addressLine1: "12 Innovation Drive",
    addressLine2: "Adeola Odeku Street, Victoria Island",
    city: "Lagos",
    country: "Nigeria",
    phone: "+234 800 555 0199",
    email: "admissions@brightfuture.example",
    officeHours: "Mon – Fri, 8:00 AM – 4:00 PM",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15864.8!2d3.4!3d6.45!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf00000000001%3A0x0!2zNsKwMjcnMDAuMCJOIDPCsDI0JzAwLjAiRQ!5e0!3m2!1sen!2sng!4v1700000000000",
  } satisfies ContactInfo,
  socials: {
    facebook: "https://facebook.com/brightfutureacademy",
    twitter: "https://twitter.com/bfa_school",
    instagram: "https://instagram.com/bfa_school",
    linkedin: "https://linkedin.com/school/bfa",
    youtube: "https://youtube.com/@bfa_school",
  } satisfies SocialLinks,
  portalHref: "/login",
  applyHref: "/apply",
} as const;

export type SiteConfig = typeof siteConfig;
