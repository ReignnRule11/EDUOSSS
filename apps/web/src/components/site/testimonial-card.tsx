import { Quote } from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import type { Testimonial } from "@/site/types";

export function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) {
  return (
    <Reveal delay={index * 100}>
      <figure className="flex h-full flex-col rounded-2xl border bg-card p-6">
        <Quote className="mb-4 h-8 w-8 text-primary/40" />
        <blockquote className="flex-1 text-sm leading-relaxed text-foreground">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
        <figcaption className="mt-4 border-t pt-4">
          <p className="font-semibold">{testimonial.author}</p>
          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
        </figcaption>
      </figure>
    </Reveal>
  );
}
