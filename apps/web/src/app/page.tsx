import { GraduationCap, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CtaBand } from "@/components/site/cta-band";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { FeatureCard } from "@/components/site/feature-card";
import { HomeHero } from "@/components/site/home-hero";
import { NewsCard } from "@/components/site/news-card";
import { PublicLayout } from "@/components/site/public-layout";
import { Reveal } from "@/components/site/reveal";
import { SchoolJsonLd } from "@/components/site/school-jsonld";
import { SectionHeading } from "@/components/site/section-heading";
import { StepsSection } from "@/components/site/steps-section";
import { TestimonialCard } from "@/components/site/testimonial-card";
import { buttonVariants } from "@/components/ui/button";
import {
  homeCta,
  homeFaqs,
  homeFeatures,
  homeGallery,
  homeNews,
  homePrograms,
  homeSteps,
  homeTestimonials,
  homeWhyUs,
} from "@/site/content/home";
import { buildMetadata } from "@/site/seo";
import { siteConfig } from "@/site/site-config";

export const metadata: Metadata = buildMetadata({
  title: siteConfig.name,
  description: siteConfig.description,
  path: "/",
  absoluteTitle: true,
});

export default function HomePage() {
  return (
    <PublicLayout>
      <SchoolJsonLd />
      <HomeHero />

      {/* Why us */}
      <section className="py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Why BFA"
            title={homeWhyUs.heading}
            description={homeWhyUs.description}
            icon={Sparkles}
            className="mb-12"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homeFeatures.map((feature, index) => (
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

      {/* Programmes */}
      <section className="bg-navy-50/60 py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Programmes"
            title={homePrograms.heading}
            description={homePrograms.description}
            icon={GraduationCap}
            className="mb-12"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {homePrograms.preview?.map((program, index) => (
              <Reveal key={program.name} delay={index * 100}>
                <div className="h-full rounded-2xl border bg-card p-6 text-center">
                  <program.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <h3 className="font-semibold">{program.name}</h3>
                  <p className="mt-1 text-xs font-medium text-primary">
                    {program.ageRange}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {program.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/academics"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Explore our curriculum
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Testimonials"
            title="Loved by parents, trusted by families"
            className="mb-12"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {homeTestimonials.map((testimonial, index) => (
              <TestimonialCard
                key={testimonial.author}
                testimonial={testimonial}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How to apply */}
      <StepsSection
        heading={homeSteps.heading}
        description={homeSteps.description}
        steps={homeSteps.steps}
      />

      {/* Latest news */}
      <section className="py-16 sm:py-20">
        <div className="container">
          <div className="mb-10 flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="News"
              title="Latest from campus"
              align="left"
              className="mb-0"
            />
            <Link
              href="/news"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all news
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {homeNews.map((item) => (
              <NewsCard key={item.slug} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Gallery strip */}
      <section className="bg-navy-50/60 py-16 sm:py-20">
        <div className="container">
          <div className="mb-10 flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Gallery"
              title="Life at Bright Future"
              align="left"
              className="mb-0"
            />
            <Link
              href="/gallery"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View gallery
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {homeGallery.map((item, index) => (
              <Reveal key={item.src} delay={index * 100}>
                <figure className="relative aspect-[3/2] overflow-hidden rounded-2xl border">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent p-3 text-xs text-white">
                    {item.caption}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="py-16 sm:py-20">
        <div className="container max-w-3xl">
          <SectionHeading
            eyebrow="FAQ"
            title="Common questions"
            className="mb-10"
          />
          <FaqAccordion items={homeFaqs} />
          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Browse all FAQs
            </Link>
          </div>
        </div>
      </section>

      <CtaBand
        heading="Give your child the Bright Future advantage"
        description="Applications for the 2026/2027 academic year are open. Book a tour or start your online application today."
        primary={homeCta}
        secondary={{ label: "Book a campus tour", href: "/contact" }}
      />
    </PublicLayout>
  );
}
