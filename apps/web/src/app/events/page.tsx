import type { Metadata } from "next";

import { CtaBand } from "@/components/site/cta-band";
import { EventCard } from "@/components/site/event-card";
import { PageHero } from "@/components/site/page-hero";
import { PublicLayout } from "@/components/site/public-layout";
import { events, eventsCta, eventsHero } from "@/site/content/events";
import { buildMetadata } from "@/site/seo";

export const metadata: Metadata = buildMetadata({
  title: "Events",
  description:
    "Upcoming events at Bright Future Academy — open days, sports festivals, exhibitions and celebrations.",
  path: "/events",
});

export default function EventsPage() {
  const featured = events.filter((event) => event.featured);
  const upcoming = events.filter((event) => !event.featured);

  return (
    <PublicLayout>
      <PageHero title={eventsHero.title} subtitle={eventsHero.subtitle} />

      {featured.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="container">
            <h2 className="mb-8 text-2xl font-bold">Featured event</h2>
            <div className="grid gap-4">
              {featured.map((event, index) => (
                <EventCard key={event.title} event={event} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-navy-50/60 py-16 sm:py-20">
        <div className="container">
          <h2 className="mb-8 text-2xl font-bold">Coming up</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((event, index) => (
              <EventCard key={event.title} event={event} index={index} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        heading="Planning a visit?"
        description="Join us at an open day or book a personalised campus tour at a time that suits you."
        primary={eventsCta}
        secondary={{ label: "Apply online", href: "/apply" }}
      />
    </PublicLayout>
  );
}
