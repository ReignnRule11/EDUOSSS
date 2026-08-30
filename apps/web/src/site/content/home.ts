import {
  BookOpen,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";

import type {
  CtaConfig,
  FaqItem,
  Feature,
  GalleryItem,
  NewsItem,
  Stat,
  Step,
  Testimonial,
} from "../types";

export const homeHero = {
  badge: "Admissions open for 2026 / 2027",
  title: "Where Every Child Learns to Shine",
  subtitle:
    "A vibrant, future-ready school community in Lagos, Nigeria — blending academic rigour, creativity and character for learners from early years to senior secondary.",
  primaryCta: { label: "Apply Now", href: "/apply" },
  secondaryCta: { label: "Book a Tour", href: "/contact" },
  image: "/site/hero-campus.svg",
  imageAlt:
    "Bright Future Academy campus with classrooms, library and play fields",
} as const;

export const homeStats: Stat[] = [
  { value: "1,250+", label: "Students" },
  { value: "98%", label: "Exam pass rate" },
  { value: "120+", label: "Dedicated staff" },
  { value: "40+", label: "Clubs & activities" },
];

export const homeFeatures: Feature[] = [
  {
    icon: GraduationCap,
    title: "Academic Excellence",
    description:
      "A rigorous, internationally inspired curriculum with strong results in national and international examinations.",
  },
  {
    icon: Lightbulb,
    title: "Innovation & STEM",
    description:
      "Purpose-built labs, robotics and coding clubs that turn curious minds into confident problem-solvers.",
  },
  {
    icon: HeartHandshake,
    title: "Character & Values",
    description:
      "A caring community that builds respect, responsibility and resilience through mentorship and service.",
  },
  {
    icon: Palette,
    title: "Arts & Culture",
    description:
      "Music, drama, visual arts and languages help every child discover and express their unique talents.",
  },
  {
    icon: Users,
    title: "Small Class Sizes",
    description:
      "With an average of 22 learners per class, every student gets the attention they deserve.",
  },
  {
    icon: Sparkles,
    title: "Modern Facilities",
    description:
      "Smart classrooms, a full library, sports fields and safe, well-equipped learning spaces.",
  },
];

export const homeWhyUs = {
  heading: "Why families choose Bright Future Academy",
  description:
    "We pair a challenging academic programme with genuine pastoral care, so children flourish in mind, body and spirit.",
};

export const homeTestimonials: Testimonial[] = [
  {
    quote:
      "The teachers know my daughter by name and by strengths. The school has transformed her confidence completely.",
    author: "Mrs. Adaeze Okonkwo",
    role: "Parent, Year 6",
  },
  {
    quote:
      "The STEM programme is exceptional. My son built his first robot at age nine and now dreams of engineering.",
    author: "Mr. Tunde Adeyemi",
    role: "Parent, Year 4",
  },
  {
    quote:
      "Discipline, warmth and excellence — Bright Future balances all three better than any school we visited.",
    author: "Dr. Sarah Johnson",
    role: "Parent, Year 2 & Year 9",
  },
];

export const homePrograms = {
  heading: "Programmes for every stage",
  description:
    "From first steps in the Early Years to focused Senior Secondary pathways, learning is purposeful at every age.",
  preview: [
    {
      icon: GraduationCap,
      name: "Early Years",
      ageRange: "Ages 3–5",
      description: "A nurturing, play-based foundation that sparks curiosity.",
    },
    {
      icon: BookOpen,
      name: "Primary",
      ageRange: "Ages 5–11",
      description:
        "A rich Cambridge-aligned curriculum with STEM and the arts.",
    },
    {
      icon: GraduationCap,
      name: "Secondary",
      ageRange: "Ages 11–18",
      description: "A rigorous path through Checkpoint, IGCSE and A-Levels.",
    },
    {
      icon: Sparkles,
      name: "Beyond the classroom",
      ageRange: "All ages",
      description: "40+ clubs, sports, music, drama and community service.",
    },
  ],
};

export const homeCta: CtaConfig = {
  label: "Start your child's journey",
  href: "/apply",
};

export const homeSteps = {
  heading: "How to apply",
  description:
    "A simple, transparent admissions journey — from first enquiry to first day.",
  steps: [
    {
      title: "Enquire & visit",
      description: "Book a tour or talk to our admissions team.",
    },
    {
      title: "Submit an application",
      description: "Complete our online application form.",
    },
    {
      title: "Assessment & interview",
      description: "Age-appropriate assessment and friendly interview.",
    },
    {
      title: "Offer & enrolment",
      description: "Receive your offer and complete enrolment.",
    },
  ] satisfies Step[],
};

export const homeNews: NewsItem[] = [
  {
    slug: "academy-wins-national-science-olympiad",
    title: "BFA Team Wins National Science Olympiad",
    date: "2026-07-18",
    excerpt:
      "Our Year 10 team brought home gold at the 2026 National Science Olympiad, beating 400 schools.",
    category: "Achievements",
    image: "/site/science-lab.svg",
  },
  {
    slug: "new-innovation-lab-opens",
    title: "New Innovation Lab Opens on Campus",
    date: "2026-06-30",
    excerpt:
      "Students now have access to 3D printers, robotics kits and a dedicated makerspace.",
    category: "Campus",
    image: "/site/technology.svg",
  },
];

export const homeGallery: GalleryItem[] = [
  {
    src: "/site/library.svg",
    alt: "Students reading in the school library",
    caption: "The library is the heart of campus",
    category: "Campus",
  },
  {
    src: "/site/sports.svg",
    alt: "Inter-house sports competition",
    caption: "Inter-house sports day",
    category: "Sports",
  },
  {
    src: "/site/science-lab.svg",
    alt: "Learners conducting experiments",
    caption: "Hands-on science",
    category: "Academics",
  },
];

export const homeFaqs: FaqItem[] = [
  {
    question: "What ages does Bright Future Academy admit?",
    answer:
      "We welcome learners from age 3 (Early Years) through Year 13 (Senior Secondary), from 11 months ahead of the UK-aligned school year.",
  },
  {
    question: "How do I apply for admission?",
    answer:
      "Visit our Admissions page or use the Online Application form. Our team will guide you through assessment and placement.",
  },
];
