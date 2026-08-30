import { Award, Eye, HeartHandshake, Target } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { CtaBand } from "@/components/site/cta-band";
import { FeatureCard } from "@/components/site/feature-card";
import { PageHero } from "@/components/site/page-hero";
import { PublicLayout } from "@/components/site/public-layout";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { TestimonialCard } from "@/components/site/testimonial-card";
import {
  aboutAccreditations,
  aboutHero,
  aboutLeadership,
  aboutMission,
  aboutStats,
  aboutStory,
  aboutValues,
  aboutVision,
} from "@/site/content/about";
import { buildMetadata } from "@/site/seo";
import { siteConfig } from "@/site/site-config";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description:
    "Learn about Bright Future Academy — our story, mission, values and the community behind the school.",
  path: "/about",
});

const VALUE_ICONS = [Target, HeartHandshake, Award, Eye] as const;

export default function AboutPage() {
  return (
    <PublicLayout>
      <PageHero title={aboutHero.title} subtitle={aboutHero.subtitle} />

      {/* Story */}
      <section className="py-16 sm:py-20">
        <div className="container grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <Image
                src="/site/hero-campus.svg"
                alt="Bright Future Academy main campus"
                width={1200}
                height={800}
                className="rounded-2xl border shadow-lg"
              />
              <div
                className="absolute -bottom-5 -right-5 -z-10 hidden h-full w-full rounded-2xl bg-primary/20 lg:block"
                aria-hidden
              />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <SectionHeading
              eyebrow="Our story"
              title={aboutStory.heading}
              align="left"
            />
            <div className="mt-5 space-y-4">
              {aboutStory.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 24)}
                  className="text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-navy-50/60 py-14">
        <div className="container grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {aboutStats.map((stat) => (
            <Reveal key={stat.label}>
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20">
        <div className="container grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border bg-navy-900 p-8 text-white">
              <Target className="mb-4 h-8 w-8 text-white" />
              <h2 className="mb-3 text-2xl font-bold">
                {aboutMission.heading}
              </h2>
              <p className="text-navy-100/90">{aboutMission.body}</p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="h-full rounded-2xl border border-primary/30 bg-primary/5 p-8">
              <Eye className="mb-4 h-8 w-8 text-primary" />
              <h2 className="mb-3 text-2xl font-bold">{aboutVision.heading}</h2>
              <p className="text-muted-foreground">{aboutVision.body}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="bg-navy-50/60 py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Our values"
            title="What we stand for"
            className="mb-12"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aboutValues.map((value, index) => (
              <FeatureCard
                key={value.title}
                icon={VALUE_ICONS[index] ?? value.icon}
                title={value.title}
                description={value.description}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Leadership"
            title="Guided by experience"
            className="mb-12"
          />
          <div className="grid gap-4 md:grid-cols-2">
            {aboutLeadership.map((member, index) => (
              <TestimonialCard
                key={member.author}
                testimonial={member}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Accreditation */}
      <section className="bg-navy-50/60 py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Accreditation"
            title={aboutAccreditations.heading}
            className="mb-12"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {aboutAccreditations.items.map((item, index) => (
              <Reveal key={item.label} delay={index * 100}>
                <div className="flex h-full flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center">
                  <item.icon className="h-10 w-10 text-primary" />
                  <p className="font-semibold">{item.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        heading="Experience the Bright Future difference"
        description="Arrange a campus tour to meet our teachers and see our community in action."
        primary={{ label: "Book a tour", href: "/contact" }}
        secondary={{ label: "Apply online", href: siteConfig.applyHref }}
      />
    </PublicLayout>
  );
}
