"use client";

import { useMemo, useState } from "react";

import { CtaBand } from "@/components/site/cta-band";
import { GalleryCard } from "@/components/site/gallery-card";
import { PageHero } from "@/components/site/page-hero";
import { PublicLayout } from "@/components/site/public-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  galleryCategories,
  galleryCta,
  galleryHero,
  galleryItems,
} from "@/site/content/gallery";

export default function GalleryPage() {
  const [category, setCategory] = useState<string>("All");

  const items = useMemo(
    () =>
      category === "All"
        ? galleryItems
        : galleryItems.filter((item) => item.category === category),
    [category],
  );

  return (
    <PublicLayout>
      <PageHero title={galleryHero.title} subtitle={galleryHero.subtitle} />

      <section className="py-16 sm:py-20">
        <div className="container">
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {galleryCategories.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(cat)}
                className={cn(category === cat && "bg-primary text-white")}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <GalleryCard
                key={`${item.src}-${item.caption}`}
                item={item}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        heading="See it for yourself"
        description="Nothing beats a campus visit. Meet our team and walk our halls with your child."
        primary={galleryCta}
        secondary={{ label: "Apply online", href: "/apply" }}
      />
    </PublicLayout>
  );
}
