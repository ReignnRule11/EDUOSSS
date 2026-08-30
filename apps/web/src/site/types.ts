import type { LucideIcon } from "lucide-react";

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
}

export interface ContactInfo {
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  officeHours: string;
  mapEmbedUrl: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface Step {
  title: string;
  description: string;
}

export interface Program {
  icon: LucideIcon;
  name: string;
  ageRange: string;
  description: string;
  features: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface NewsItem {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  image: string;
}

export interface EventItem {
  title: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  featured?: boolean;
}

export interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
  category: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export interface CtaConfig {
  label: string;
  href: string;
}
