import type { Metadata } from "next";

import { CtaBand } from "@/components/site/cta-band";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { FeatureCard } from "@/components/site/feature-card";
import { PageHero, PageHeroAction } from "@/components/site/page-hero";
import { ProgramCard } from "@/components/site/program-card";
import { PublicLayout } from "@/components/site/public-layout";
import { SectionHeading } from "@/components/site/section-heading";
import { StepsSection } from "@/components/site/steps-section";
import {
  admissionsCta,
  admissionsFaqs,
  admissionsHero,
  admissionsPrograms,
  admissionsRequirements,
  admissionsSteps,
} from "@/site/content/admissions";
import { buildMetadata } from "@/site/seo";

export const metadata: Metadata = buildMetadata({
  title: "Admissions",
  description:
    "How to apply to Bright Future Academy — entry points, requirements, fees and the admissions process.",
  path: "/admissions",
});

export default function AdmissionsPage() {
  return (
    <PublicLayout>
      <PageHero title={admissionsHero.title} subtitle={admissionsHero.subtitle}>
        <PageHeroAction href="/apply">Apply online</PageHeroAction>
        <PageHeroAction href="/contact" variant="outline">
          Book a tour
        </PageHeroAction>
      </PageHero>

      <StepsSection
        heading={admissionsSteps.heading}
        description={admissionsSteps.description}
        steps={admissionsSteps.steps}
      />

      {/* Requirements */}
      <section className="py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="What you'll need"
            title="Admission requirements"
            className="mb-12"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {admissionsRequirements.map((requirement, index) => (
              <FeatureCard
                key={requirement.title}
                icon={requirement.icon}
                title={requirement.title}
                description={requirement.description}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section className="bg-navy-50/60 py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Sections"
            title="Programmes we offer"
            description="Find the right entry point for your child."
            className="mb-12"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {admissionsPrograms.map((program, index) => (
              <ProgramCard key={program.name} program={program} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="container max-w-3xl">
          <SectionHeading
            eyebrow="Admissions FAQ"
            title="Frequently asked questions"
            className="mb-10"
          />
          <FaqAccordion items={admissionsFaqs} />
        </div>
      </section>

      <CtaBand
        heading={admissionsCta.label}
        description="Applications for the 2026/2027 academic year are open. Begin your child's journey today."
        primary={{ label: admissionsCta.label, href: admissionsCta.href }}
        secondary={{ label: "Talk to admissions", href: "/contact" }}
      />
    </PublicLayout>
  );
}
