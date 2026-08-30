import type { Metadata } from "next";

import { CtaBand } from "@/components/site/cta-band";
import { FeatureCard } from "@/components/site/feature-card";
import { PageHero, PageHeroAction } from "@/components/site/page-hero";
import { ProgramCard } from "@/components/site/program-card";
import { PublicLayout } from "@/components/site/public-layout";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import {
  academicsCta,
  academicsFeatures,
  academicsHero,
  academicsPathway,
  academicsStats,
} from "@/site/content/academics";
import { buildMetadata } from "@/site/seo";

export const metadata: Metadata = buildMetadata({
  title: "Academics",
  description:
    "Explore the Bright Future Academy curriculum — from Early Years through Cambridge Primary, IGCSE and A-Levels.",
  path: "/academics",
});

export default function AcademicsPage() {
  return (
    <PublicLayout>
      <PageHero title={academicsHero.title} subtitle={academicsHero.subtitle}>
        <PageHeroAction href="/apply">Apply now</PageHeroAction>
        <PageHeroAction href="/contact" variant="outline">
          Talk to admissions
        </PageHeroAction>
      </PageHero>

      {/* Learning pathway */}
      <section className="py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Learning pathway"
            title="A journey from Early Years to A-Levels"
            description="Every stage builds on the last, preparing learners for success in school and beyond."
            className="mb-12"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {academicsPathway.map((program, index) => (
              <ProgramCard key={program.name} program={program} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-navy-50/60 py-14">
        <div className="container grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {academicsStats.map((stat) => (
            <Reveal key={stat.label}>
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Facilities */}
      <section className="py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Learning environments"
            title="Facilities that inspire"
            className="mb-12"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {academicsFeatures.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        heading="Ready to learn with us?"
        description="Our admissions team is happy to answer questions about our curriculum and entry requirements."
        primary={academicsCta}
        secondary={{ label: "Book a campus tour", href: "/contact" }}
      />
    </PublicLayout>
  );
}
