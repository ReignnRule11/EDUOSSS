import type { CtaConfig, EventItem } from "../types";

export const eventsHero = {
  title: "Events",
  subtitle:
    "From open days to sports festivals and cultural celebrations — there is always something happening at BFA.",
};

export const events: EventItem[] = [
  {
    title: "Autumn Open Day & Campus Tour",
    date: "2026-09-12",
    time: "9:00 AM – 1:00 PM",
    venue: "Main Campus, Victoria Island",
    description:
      "Meet our teachers, tour the campus and learn about our Early Years and Primary programmes. Light refreshments provided.",
    featured: true,
  },
  {
    title: "Annual Inter-House Sports Festival",
    date: "2026-10-17",
    time: "8:00 AM – 4:00 PM",
    venue: "Sports Field",
    description:
      "A day of athletics, swimming and team games as our four houses compete for the championship trophy.",
  },
  {
    title: "Secondary STEM Exhibition",
    date: "2026-11-07",
    time: "10:00 AM – 2:00 PM",
    venue: "Innovation Lab & Hall",
    description:
      "Year 9–13 students present their robotics, coding and science projects to families and industry guests.",
  },
  {
    title: "Winter Music & Drama Showcase",
    date: "2026-12-12",
    time: "5:00 PM – 8:00 PM",
    venue: "Performing Arts Centre",
    description:
      "An evening of choir, band and drama performances celebrating the festive season.",
  },
  {
    title: "Parent–Teacher Conferences",
    date: "2027-01-23",
    time: "9:00 AM – 4:00 PM",
    venue: "Throughout campus",
    description:
      "A dedicated day for parents to meet teachers, review progress and plan the term ahead.",
  },
  {
    title: "Graduation Ceremony",
    date: "2027-07-09",
    time: "10:00 AM – 1:00 PM",
    venue: "Great Hall",
    description:
      "Celebrating our Year 13 graduates and the end of the 2026/27 academic year.",
  },
];

export const eventsCta: CtaConfig = {
  label: "Book a campus tour",
  href: "/contact",
};
