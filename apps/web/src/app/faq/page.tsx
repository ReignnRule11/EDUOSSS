import type { Metadata } from "next";

import { CtaBand } from "@/components/site/cta-band";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { PageHero } from "@/components/site/page-hero";
import { PublicLayout } from "@/components/site/public-layout";
import { SectionHeading } from "@/components/site/section-heading";
import { faqCategories, faqCta, faqHero } from "@/site/content/faq";
import { buildMetadata } from "@/site/seo";

export const metadata: Metadata = buildMetadata({
  title: "FAQ",
  description:
    "Answers to frequently asked questions about admissions, fees, school life and the curriculum at Bright Future Academy.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <PublicLayout>
      <PageHero title={faqHero.title} subtitle={faqHero.subtitle} />

      <section className="py-16 sm:py-20">
        <div className="container max-w-3xl space-y-14">
          {faqCategories.map((group) => (
            <div key={group.category}>
              <SectionHeading
                eyebrow={group.category}
                title={group.category}
                align="left"
                className="mb-6"
              />
              <FaqAccordion items={group.items} />
            </div>
          ))}
        </div>
      </section>

      <CtaBand
        heading="Still have questions?"
        description="Our friendly admissions and office teams are happy to help you directly."
        primary={{ label: "Contact us", href: faqCta.href }}
        secondary={{ label: "Book a tour", href: "/contact" }}
      />
    </PublicLayout>
  );
}
