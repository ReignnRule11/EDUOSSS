import type { Metadata } from "next";

import { ApplicationForm } from "@/components/site/application-form";
import { PageHero } from "@/components/site/page-hero";
import { PublicLayout } from "@/components/site/public-layout";
import { Reveal } from "@/components/site/reveal";
import { buildMetadata } from "@/site/seo";
import { siteConfig } from "@/site/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Online Application",
  description:
    "Apply for admission to Bright Future Academy online — a simple, secure application in minutes.",
  path: "/apply",
});

export default function ApplyPage() {
  return (
    <PublicLayout>
      <PageHero
        title="Online application"
        subtitle={`Apply for admission to ${siteConfig.name} in a few easy steps. A member of our admissions team will be in touch within two working days.`}
      />

      <section className="py-16 sm:py-20">
        <div className="container max-w-3xl">
          <Reveal>
            <div className="rounded-2xl border bg-card p-6 sm:p-10">
              <ApplicationForm />
            </div>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
