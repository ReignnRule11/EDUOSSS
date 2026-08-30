import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
} from "lucide-react";

import type { CtaConfig, FaqItem, Feature, Program, Step } from "../types";

export const admissionsHero = {
  title: "Admissions",
  subtitle:
    "We welcome applications throughout the year. Learn about entry points, requirements and how to secure your child's place at Bright Future Academy.",
};

export const admissionsSteps = {
  heading: "The admissions process",
  description:
    "Four simple steps from first enquiry to enrolment — we guide you at every stage.",
  steps: [
    {
      title: "Enquire & visit",
      description:
        "Contact our admissions team or book a campus tour to meet our community and see learning in action.",
    },
    {
      title: "Submit an application",
      description:
        "Complete our online application form with your child's details and supporting documents.",
    },
    {
      title: "Assessment & interview",
      description:
        "Age-appropriate assessments and a friendly meeting help us place your child in the right class.",
    },
    {
      title: "Offer & enrolment",
      description:
        "Successful applicants receive an offer. Complete enrolment and your child is ready to begin!",
    },
  ] satisfies Step[],
};

export const admissionsRequirements: Feature[] = [
  {
    icon: FileText,
    title: "Application form",
    description:
      "Completed online application with parent and emergency contact details.",
  },
  {
    icon: ClipboardList,
    title: "Academic records",
    description:
      "Report cards or transcripts from the last two school years, where applicable.",
  },
  {
    icon: GraduationCap,
    title: "Age documentation",
    description:
      "Birth certificate or equivalent age verification for the applied entry point.",
  },
  {
    icon: CalendarCheck,
    title: "Entrance assessment",
    description:
      "An age-appropriate assessment (and interview for secondary applicants).",
  },
];

export const admissionsFaqs: FaqItem[] = [
  {
    question: "When does the academic year begin?",
    answer:
      "Our academic year runs from September to July, split into three terms with short half-term breaks.",
  },
  {
    question: "Do you offer scholarships?",
    answer:
      "Yes. We award merit-based and needs-based scholarships at secondary level each academic year.",
  },
  {
    question: "Is there a sibling discount?",
    answer:
      "Families with two or more children at Bright Future receive a 10% sibling discount on tuition.",
  },
  {
    question: "What is the application fee?",
    answer:
      "A non-refundable application fee of 15,000 NGN applies per child. It covers processing and assessment.",
  },
];

export const admissionsCta: CtaConfig = {
  label: "Apply for admission",
  href: "/apply",
};

export const admissionsContact = {
  heading: "Talk to our admissions team",
  phone: "+234 800 555 0199",
  email: "admissions@brightfuture.example",
};

export const admissionsPrograms: Program[] = [
  {
    icon: GraduationCap,
    name: "Early Years",
    ageRange: "Ages 3–5",
    description:
      "A nurturing, play-based foundation that sparks curiosity and builds early literacy, numeracy and social confidence.",
    features: [
      "Learning through play",
      "Phonics & early reading",
      "Music & movement",
    ],
  },
  {
    icon: BookOpen,
    name: "Primary",
    ageRange: "Ages 5–11",
    description:
      "A rich Cambridge-aligned curriculum that deepens core skills and introduces languages, STEM and the arts.",
    features: ["Cambridge Primary", "STEM & coding clubs", "Swimming & sports"],
  },
  {
    icon: GraduationCap,
    name: "Secondary",
    ageRange: "Ages 11–18",
    description:
      "A rigorous pathway through Checkpoint, IGCSE and A-Levels with strong pastoral support and university guidance.",
    features: [
      "IGCSE & A-Levels",
      "University counselling",
      "Leadership programmes",
    ],
  },
];
