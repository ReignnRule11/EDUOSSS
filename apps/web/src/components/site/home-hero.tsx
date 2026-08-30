import { ArrowRight, BadgeCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { homeHero, homeStats } from "@/site/content/home";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-50 via-navy-50/40 to-background">
      <div className="container grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary animate-fade-up">
            <BadgeCheck className="h-3.5 w-3.5" />
            {homeHero.badge}
          </span>

          <h1 className="text-4xl font-bold tracking-tight text-balance animate-fade-up delay-100 sm:text-5xl lg:text-6xl">
            {homeHero.title}
          </h1>

          <p className="max-w-xl text-base text-muted-foreground animate-fade-up delay-200 sm:text-lg">
            {homeHero.subtitle}
          </p>

          <div className="flex flex-wrap gap-3 animate-fade-up delay-300">
            <Link
              href={homeHero.primaryCta.href}
              className={buttonVariants({ size: "lg" })}
            >
              {homeHero.primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={homeHero.secondaryCta.href}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              {homeHero.secondaryCta.label}
            </Link>
          </div>

          <dl className="grid grid-cols-2 gap-4 pt-4 animate-fade-up delay-400 sm:grid-cols-4">
            {homeStats.map((stat) => (
              <div key={stat.label} className="space-y-0.5">
                <dt className="order-2 text-xs text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="text-2xl font-bold text-primary">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-fade-in delay-200">
          <Image
            src={homeHero.image}
            alt={homeHero.imageAlt}
            width={1200}
            height={800}
            priority
            unoptimized
            className="rounded-2xl border shadow-2xl shadow-navy-900/20"
          />
          <div
            className="absolute -bottom-6 -left-6 -z-10 hidden h-full w-full rounded-2xl bg-primary/20 lg:block animate-float"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
