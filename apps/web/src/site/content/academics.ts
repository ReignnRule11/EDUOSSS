import {
  BookOpen,
  FlaskConical,
  Globe2,
  GraduationCap,
  Laptop,
  Palette,
  Trophy,
  Users,
} from "lucide-react";

import type { CtaConfig, Feature, Program, Stat } from "../types";

export const academicsHero = {
  title: "Academics",
  subtitle:
    "A challenging, future-ready curriculum from Early Years to A-Levels, taught by passionate specialists in modern classrooms.",
};

export const academicsPathway: Program[] = [
  {
    icon: GraduationCap,
    name: "Early Years Foundation Stage",
    ageRange: "Ages 3–5",
    description:
      "A play-based foundation rooted in the EYFS framework, building early communication, numeracy and wellbeing.",
    features: ["Phonics & early reading", "Number sense", "Creative play"],
  },
  {
    icon: BookOpen,
    name: "Cambridge Primary",
    ageRange: "Ages 5–11",
    description:
      "A broad, balanced curriculum covering English, Maths, Science and Computing with global benchmarks.",
    features: ["Cambridge Primary", "French & Yoruba", "Swimming, PE & sports"],
  },
  {
    icon: GraduationCap,
    name: "Cambridge Lower Secondary",
    ageRange: "Ages 11–14",
    description:
      "Deepens subject mastery and introduces independent study skills ahead of formal examinations.",
    features: ["Cambridge Checkpoint", "Robotics & coding", "Drama & debate"],
  },
  {
    icon: Trophy,
    name: "IGCSE & A-Levels",
    ageRange: "Ages 14–18",
    description:
      "Rigorous pre-university pathways with expert teaching, exam preparation and university counselling.",
    features: ["IGCSE & A-Levels", "STEM specialisms", "University guidance"],
  },
];

export const academicsFeatures: Feature[] = [
  {
    icon: FlaskConical,
    title: "Science & Labs",
    description:
      "Dedicated physics, chemistry and biology labs for hands-on practical learning.",
  },
  {
    icon: Laptop,
    title: "Computing & Robotics",
    description:
      "A 1:1 device programme with coding, robotics and digital citizenship from Year 3.",
  },
  {
    icon: Palette,
    title: "Arts & Music",
    description:
      "Visual arts, music, drama and dance studios that develop creativity and confidence.",
  },
  {
    icon: Globe2,
    title: "Languages",
    description:
      "English, French and Yoruba taught progressively across all key stages.",
  },
  {
    icon: Users,
    title: "Pastoral care",
    description:
      "Every learner has a form tutor and a clear wellbeing pathway throughout their time with us.",
  },
];

export const academicsStats: Stat[] = [
  { value: "98%", label: "IGCSE pass rate (2025)" },
  { value: "100%", label: "A-Level pass rate (2025)" },
  { value: "15:1", label: "Student–teacher ratio" },
  { value: "85%", label: "Oxbridge & Russell Group offers" },
];

export const academicsCta: CtaConfig = {
  label: "Explore our curriculum",
  href: "/contact",
};
