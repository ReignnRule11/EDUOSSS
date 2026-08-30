import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/site/reveal";
import { buttonVariants } from "@/components/ui/button";
import type { Step } from "@/site/types";

export function StepsSection({
  heading,
  description,
  steps,
  cta,
}: {
  heading: string;
  description: string;
  steps: Step[];
  cta?: { label: string; href: string };
}) {
  return (
    <section className="bg-navy-50/60 py-16 sm:py-20">
      <div className="container">
        <Reveal>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-3 text-muted-foreground">{description}</p>
          </div>
        </Reveal>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 100}>
              <li className="relative h-full rounded-2xl border bg-card p-6">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>

        {cta && (
          <Reveal className="mt-10 text-center">
            <Link href={cta.href} className={buttonVariants({ size: "lg" })}>
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}
