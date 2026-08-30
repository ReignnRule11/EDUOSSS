import Image from "next/image";

import { Reveal } from "@/components/site/reveal";
import { Badge } from "@/components/ui/badge";
import type { GalleryItem } from "@/site/types";

export function GalleryCard({
  item,
  index,
}: {
  item: GalleryItem;
  index: number;
}) {
  return (
    <Reveal delay={(index % 4) * 80}>
      <figure className="group relative aspect-[3/2] overflow-hidden rounded-2xl border">
        <Image
          src={item.src}
          alt={item.alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 to-transparent p-4 pt-10 text-white">
          <Badge
            variant="secondary"
            className="mb-2 bg-white/20 text-white backdrop-blur"
          >
            {item.category}
          </Badge>
          <p className="text-sm font-medium">{item.caption}</p>
        </figcaption>
      </figure>
    </Reveal>
  );
}
