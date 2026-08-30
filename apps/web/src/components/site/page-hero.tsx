import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  children?: React.ReactNode;
}

export function PageHero({ title, subtitle, children }: PageHeroProps) {
  return (
    <section className="border-b bg-gradient-to-b from-navy-50 to-background">
      <div className="container py-16 text-center sm:py-20">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
        )}
        {children && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

export function PageHeroAction({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  return (
    <Link href={href} className={buttonVariants({ size: "lg", variant })}>
      {children}
    </Link>
  );
}
