import { ArrowLeft, CalendarDays, Tag } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaBand } from "@/components/site/cta-band";
import { PublicLayout } from "@/components/site/public-layout";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { newsItems } from "@/site/content/news";
import { buildMetadata } from "@/site/seo";
import { siteConfig } from "@/site/site-config";

interface NewsDetailProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return newsItems.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: NewsDetailProps): Promise<Metadata> {
  const item = newsItems.find((news) => news.slug === params.slug);
  if (!item) return {};
  return buildMetadata({
    title: item.title,
    description: item.excerpt,
    path: `/news/${item.slug}`,
    image: item.image,
    type: "article",
  });
}

export default function NewsDetailPage({ params }: NewsDetailProps) {
  const item = newsItems.find((news) => news.slug === params.slug);
  if (!item) notFound();

  return (
    <PublicLayout>
      <article className="py-14 sm:py-20">
        <div className="container max-w-3xl">
          <Link
            href="/news"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "mb-6 -ml-2 text-muted-foreground",
            })}
          >
            <ArrowLeft className="h-4 w-4" />
            All news
          </Link>

          <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">
              <Tag className="mr-1 h-3 w-3" />
              {item.category}
            </Badge>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {new Date(item.date).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {item.title}
          </h1>

          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border">
            <Image
              src={item.image}
              alt={item.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>

          <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
            <p className="text-lg font-medium text-foreground">
              {item.excerpt}
            </p>
            <p>
              The {siteConfig.name} community is proud of this milestone, which
              reflects the dedication of our students, the expertise of our
              teachers and the partnership of our families.
            </p>
            <p>
              Throughout the term, our learners continue to demonstrate that
              curiosity and hard work open doors to extraordinary opportunities.
              We look forward to celebrating many more achievements in the
              months ahead.
            </p>
            <p>
              For the full story, photos and reactions, follow us on social
              media or contact our communications team.
            </p>
          </div>
        </div>
      </article>

      <CtaBand
        heading="Be part of the next success story"
        description="Join a school where achievement is celebrated and every child is known by name."
        primary={{ label: "Apply now", href: siteConfig.applyHref }}
        secondary={{ label: "Contact us", href: "/contact" }}
      />
    </PublicLayout>
  );
}
