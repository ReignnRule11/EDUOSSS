import type { Metadata } from "next";

import { CtaBand } from "@/components/site/cta-band";
import { NewsCard } from "@/components/site/news-card";
import { PageHero } from "@/components/site/page-hero";
import { PublicLayout } from "@/components/site/public-layout";
import { newsCta, newsHero, newsItems } from "@/site/content/news";
import { buildMetadata } from "@/site/seo";

export const metadata: Metadata = buildMetadata({
  title: "News",
  description:
    "Latest news, achievements and updates from Bright Future Academy.",
  path: "/news",
});

export default function NewsPage() {
  return (
    <PublicLayout>
      <PageHero title={newsHero.title} subtitle={newsHero.subtitle} />

      <section className="py-16 sm:py-20">
        <div className="container">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {newsItems.map((item) => (
              <NewsCard key={item.slug} item={item} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        heading="Never miss an update"
        description="Follow us on social media for day-to-day life at Bright Future Academy."
        primary={newsCta}
        secondary={{ label: "Contact us", href: "/contact" }}
      />
    </PublicLayout>
  );
}
