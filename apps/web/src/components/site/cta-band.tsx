import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/site/reveal";
import { buttonVariants } from "@/components/ui/button";
import type { CtaConfig } from "@/site/types";

interface CtaBandProps {
  heading: string;
  description: string;
  primary: CtaConfig;
  secondary?: CtaConfig;
}

export function CtaBand({
  heading,
  description,
  primary,
  secondary,
}: CtaBandProps) {
  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-14 text-center text-white sm:px-12">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background:
                  "radial-gradient(600px 300px at 20% 20%, #4169e1 0%, transparent 60%), radial-gradient(500px 280px at 80% 80%, #60a5fa 0%, transparent 60%)",
              }}
              aria-hidden
            />
            <div className="relative mx-auto max-w-2xl space-y-5">
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                {heading}
              </h2>
              <p className="text-navy-100/90">{description}</p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href={primary.href}
                  className={buttonVariants({
                    size: "lg",
                    className:
                      "bg-white text-navy-900 hover:bg-navy-100 hover:text-navy-900",
                  })}
                >
                  {primary.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {secondary && (
                  <Link
                    href={secondary.href}
                    className={buttonVariants({
                      size: "lg",
                      variant: "outline",
                      className:
                        "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
                    })}
                  >
                    {secondary.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
