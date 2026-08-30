import type { Metadata } from "next";

import {
  ContactInfoCard,
  CampusImage,
  SocialLinksRow,
} from "@/components/site/contact-extras";
import { ContactForm } from "@/components/site/contact-form";
import { MapEmbed } from "@/components/site/map-embed";
import { PageHero } from "@/components/site/page-hero";
import { PublicLayout } from "@/components/site/public-layout";
import { Reveal } from "@/components/site/reveal";
import { contactDepartments, contactHero } from "@/site/content/contact";
import { buildMetadata } from "@/site/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description:
    "Contact Bright Future Academy — book a campus tour, reach our admissions team, or find us on the map.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <PublicLayout>
      <PageHero title={contactHero.title} subtitle={contactHero.subtitle} />

      <section className="py-16 sm:py-20">
        <div className="container grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Send us a message</h2>
              <ContactForm />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-8">
              <ContactInfoCard />
              <div>
                <h3 className="mb-3 text-lg font-semibold">Departments</h3>
                <div className="space-y-3">
                  {contactDepartments.map((dept) => (
                    <div
                      key={dept.name}
                      className="flex flex-col rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <p className="font-semibold">{dept.name}</p>
                      <div className="flex flex-col gap-0.5 text-muted-foreground sm:items-end">
                        <a
                          href={`mailto:${dept.email}`}
                          className="hover:text-primary"
                        >
                          {dept.email}
                        </a>
                        <a
                          href={`tel:${dept.phone.replace(/\s/g, "")}`}
                          className="hover:text-primary"
                        >
                          {dept.phone}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold">Follow us</h3>
                <SocialLinksRow />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="container">
          <Reveal>
            <CampusImage />
          </Reveal>
        </div>
      </section>

      <section className="border-t bg-navy-50/60 py-16 sm:py-20">
        <div className="container">
          <Reveal>
            <MapEmbed />
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
