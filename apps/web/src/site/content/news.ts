import type { CtaConfig, NewsItem } from "../types";

export const newsHero = {
  title: "News",
  subtitle:
    "Stories, achievements and updates from across the Bright Future Academy community.",
};

export const newsCategories = [
  "All",
  "Achievements",
  "Campus",
  "Academics",
  "Community",
] as const;

export const newsItems: NewsItem[] = [
  {
    slug: "academy-wins-national-science-olympiad",
    title: "BFA Team Wins National Science Olympiad",
    date: "2026-07-18",
    excerpt:
      "Our Year 10 team brought home gold at the 2026 National Science Olympiad, beating 400 schools from across the country.",
    category: "Achievements",
    image: "/site/science-lab.svg",
  },
  {
    slug: "new-innovation-lab-opens",
    title: "New Innovation Lab Opens on Campus",
    date: "2026-06-30",
    excerpt:
      "Students now have access to 3D printers, robotics kits and a dedicated makerspace to bring their ideas to life.",
    category: "Campus",
    image: "/site/technology.svg",
  },
  {
    slug: "igcse-results-class-2026",
    title: "Record IGCSE Results for the Class of 2026",
    date: "2026-06-12",
    excerpt:
      "98% of our IGCSE candidates earned A*–C grades, with over a third achieving straight A*–A.",
    category: "Achievements",
    image: "/site/graduation.svg",
  },
  {
    slug: "community-cleanup-day",
    title: "Students Lead Community Clean-Up Day",
    date: "2026-05-22",
    excerpt:
      "Over 200 students, parents and staff joined forces to clean and beautify our neighbouring streets.",
    category: "Community",
    image: "/site/sports.svg",
  },
  {
    slug: "library-refurbishment-complete",
    title: "Library Refurbishment Complete",
    date: "2026-04-10",
    excerpt:
      "Our renewed library now features reading nooks, a digital corner and over 15,000 books.",
    category: "Campus",
    image: "/site/library.svg",
  },
  {
    slug: "primary-science-fair",
    title: "Primary Science Fair Inspires Young Inventors",
    date: "2026-03-28",
    excerpt:
      "From erupting volcanoes to model wind farms, our primary learners showcased remarkable creativity.",
    category: "Academics",
    image: "/site/science-lab.svg",
  },
];

export const newsCta: CtaConfig = {
  label: "See what's on",
  href: "/events",
};
