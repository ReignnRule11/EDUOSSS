import type { CtaConfig, FaqItem } from "../types";

export const faqHero = {
  title: "Frequently asked questions",
  subtitle:
    "Answers to the questions families ask us most. Can't find what you're looking for? Get in touch.",
};

export const faqCategories = [
  {
    category: "Admissions",
    items: [
      {
        question: "What ages does Bright Future Academy admit?",
        answer:
          "We welcome learners from age 3 in Early Years through to Year 13 (age 18) in Senior Secondary.",
      },
      {
        question: "When can I apply?",
        answer:
          "Applications open in January for the following September and remain open throughout the year subject to availability.",
      },
      {
        question: "Is there an entrance exam?",
        answer:
          "Yes. Learners joining from Reception upwards complete an age-appropriate assessment; secondary applicants also attend an interview.",
      },
    ],
  },
  {
    category: "Fees & scholarships",
    items: [
      {
        question: "How much are school fees?",
        answer:
          "Fees vary by section and include tuition, core learning materials and most co-curricular activities. Contact admissions for a full schedule.",
      },
      {
        question: "Do you offer scholarships?",
        answer:
          "Yes — merit-based and needs-based scholarships are available at secondary level. Applications open each spring.",
      },
      {
        question: "Is there a sibling discount?",
        answer:
          "Families with two or more children enrolled receive a 10% discount on tuition fees.",
      },
    ],
  },
  {
    category: "School life",
    items: [
      {
        question: "What are the school hours?",
        answer:
          "Early Years run 8:00 AM – 2:00 PM, and Primary and Secondary run 8:00 AM – 3:30 PM, Monday to Friday.",
      },
      {
        question: "Do you provide transport?",
        answer:
          "Yes, safe door-to-door school bus services operate across Lagos with trained escorts on every route.",
      },
      {
        question: "What clubs and activities are available?",
        answer:
          "Over 40 clubs including robotics, debate, football, swimming, music, drama, chess and community service.",
      },
    ],
  },
  {
    category: "Curriculum",
    items: [
      {
        question: "Which curriculum do you follow?",
        answer:
          "We follow the Cambridge Assessment International Education pathway: Cambridge Primary, Lower Secondary, IGCSE and A-Levels.",
      },
      {
        question: "What languages do you teach?",
        answer:
          "English is the language of instruction. French and Yoruba are taught across all key stages.",
      },
    ],
  },
] satisfies { category: string; items: FaqItem[] }[];

export const faqCta: CtaConfig = {
  label: "Still have questions?",
  href: "/contact",
};
