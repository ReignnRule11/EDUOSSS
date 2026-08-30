import { CalendarDays, Clock, MapPin } from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import { Badge } from "@/components/ui/badge";
import type { EventItem } from "@/site/types";

export function EventCard({
  event,
  index,
}: {
  event: EventItem;
  index: number;
}) {
  const date = new Date(event.date);

  return (
    <Reveal delay={(index % 3) * 80}>
      <article className="flex h-full gap-4 rounded-2xl border bg-card p-5">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-xl font-bold leading-none">
            {date.getDate()}
          </span>
          <span className="text-xs uppercase">
            {date.toLocaleDateString("en-GB", { month: "short" })}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            {event.featured && <Badge>Featured</Badge>}
          </div>
          <h3 className="font-semibold leading-snug">{event.title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {event.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {event.time}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {event.venue}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {date.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
