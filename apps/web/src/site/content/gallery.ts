import type { CtaConfig, GalleryItem } from "../types";

export const galleryHero = {
  title: "Gallery",
  subtitle:
    "A glimpse of daily life at Bright Future Academy — learning, play, competition and celebration.",
};

export const galleryCategories = [
  "All",
  "Campus",
  "Academics",
  "Sports",
  "Arts",
  "Events",
] as const;

export const galleryItems: GalleryItem[] = [
  {
    src: "/site/library.svg",
    alt: "Students reading in the school library",
    caption: "Quiet reading time in the library",
    category: "Campus",
  },
  {
    src: "/site/science-lab.svg",
    alt: "Learners conducting a chemistry experiment",
    caption: "Year 10 chemistry practical",
    category: "Academics",
  },
  {
    src: "/site/sports.svg",
    alt: "Inter-house sports competition on the field",
    caption: "Annual inter-house sports day",
    category: "Sports",
  },
  {
    src: "/site/performing-arts.svg",
    alt: "Drama club performance on stage",
    caption: "Drama club end-of-term production",
    category: "Arts",
  },
  {
    src: "/site/graduation.svg",
    alt: "Graduation ceremony for Year 13 leavers",
    caption: "A-Level graduation, Class of 2026",
    category: "Events",
  },
  {
    src: "/site/technology.svg",
    alt: "Students working with laptops in the technology lab",
    caption: "Innovation lab computing session",
    category: "Academics",
  },
  {
    src: "/site/hero-campus.svg",
    alt: "Aerial view of the Bright Future Academy campus",
    caption: "Our main campus building",
    category: "Campus",
  },
  {
    src: "/site/graduation.svg",
    alt: "Students in graduation gowns celebrating",
    caption: "IGCSE results celebration",
    category: "Events",
  },
];

export const galleryCta: CtaConfig = {
  label: "Visit us in person",
  href: "/contact",
};
