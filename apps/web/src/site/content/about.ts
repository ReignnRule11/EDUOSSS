import {
  Award,
  HeartHandshake,
  Eye,
  Leaf,
  ShieldCheck,
  Target,
} from "lucide-react";

import type { Feature, Stat, Testimonial } from "../types";

export const aboutHero = {
  title: "About Bright Future Academy",
  subtitle:
    "Established in 2008, we have grown from a single classroom into one of Lagos' most respected schools — while keeping our founding promise of personal attention for every child.",
};

export const aboutStory = {
  heading: "Our story",
  paragraphs: [
    "Bright Future Academy opened its doors in 2008 with 34 students and a simple conviction: that great education is personal. Sixteen years on, we now welcome over 1,250 learners across our Early Years, Primary and Senior Secondary sections.",
    "We are a proudly British-curriculum school with a distinctly Nigerian heart. Our learners sit Cambridge Checkpoint, IGCSE and A-Level examinations, while our co-curricular programme nurtures leadership, service and creativity.",
    "Above all, we remain a community. Parents know their child's teachers by name, teachers know every child's story, and every success is celebrated together.",
  ],
};

export const aboutStats: Stat[] = [
  { value: "2008", label: "Founded" },
  { value: "1,250+", label: "Students" },
  { value: "120+", label: "Staff" },
  { value: "98%", label: "Pass rate" },
];

export const aboutValues: Feature[] = [
  {
    icon: Target,
    title: "Excellence",
    description:
      "We set high expectations and give every learner the support to reach them.",
  },
  {
    icon: HeartHandshake,
    title: "Integrity",
    description:
      "Honesty, kindness and respect are non-negotiable in our community.",
  },
  {
    icon: Eye,
    title: "Curiosity",
    description:
      "We celebrate questions and reward the courage to explore the unknown.",
  },
  {
    icon: Leaf,
    title: "Service",
    description:
      "We grow leaders who give back — to school, community and country.",
  },
];

export const aboutMission = {
  heading: "Our mission",
  body: "To nurture confident, compassionate and capable young people who excel academically and make a positive difference in the world.",
};

export const aboutVision = {
  heading: "Our vision",
  body: "To be the region's leading school of the future — a place where innovation, character and academic excellence meet.",
};

export const aboutAccreditations = {
  heading: "Accreditation & affiliations",
  items: [
    { icon: Award, label: "Cambridge Assessment International Education" },
    { icon: ShieldCheck, label: "Nigerian Ministry of Education licensed" },
    { icon: Award, label: "British Council partner school" },
  ],
};

export const aboutLeadership: Testimonial[] = [
  {
    quote:
      "Every decision we make starts with one question: what is best for this child?",
    author: "Mrs. Folake Adebayo",
    role: "Principal & Founder",
  },
  {
    quote:
      "We build future-ready learners — critical thinkers who can thrive in a changing world.",
    author: "Mr. Chinedu Eze",
    role: "Head of Academics",
  },
];
