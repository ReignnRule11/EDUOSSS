import { Check } from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import type { Program } from "@/site/types";

export function ProgramCard({
  program,
  index,
}: {
  program: Program;
  index: number;
}) {
  const Icon = program.icon;
  return (
    <Reveal delay={(index % 3) * 100}>
      <div className="flex h-full flex-col rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">{program.name}</h3>
            <p className="text-xs font-medium text-primary">
              {program.ageRange}
            </p>
          </div>
        </div>
        <p className="mb-4 flex-1 text-sm text-muted-foreground">
          {program.description}
        </p>
        <ul className="space-y-2">
          {program.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
