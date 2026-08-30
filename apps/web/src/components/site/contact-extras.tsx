import {
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/site/site-config";
import type { SocialLinks } from "@/site/types";

const socialIcons: Record<
  keyof SocialLinks,
  React.ComponentType<{ className?: string }>
> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

export function ContactInfoCard() {
  const { contact } = siteConfig;
  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Visit us</h3>
          <p className="text-sm text-muted-foreground">
            {contact.addressLine1}, {contact.addressLine2}, {contact.city},{" "}
            {contact.country}
          </p>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Phone className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Call us</h3>
          <p className="text-sm text-muted-foreground">{contact.phone}</p>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Email us</h3>
          <p className="text-sm text-muted-foreground">{contact.email}</p>
        </div>
      </div>
    </div>
  );
}

export function SocialLinksRow() {
  const { socials } = siteConfig;
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(socialIcons) as (keyof SocialLinks)[]).map((key) => {
        const href = socials[key];
        if (!href) return null;
        const Icon = socialIcons[key];
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={key}
            className="flex h-11 w-11 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-all hover:border-primary hover:bg-primary hover:text-white"
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}

export function CampusImage() {
  return (
    <div className="relative">
      <Image
        src="/site/hero-campus.svg"
        alt="Bright Future Academy campus"
        width={1200}
        height={800}
        className="rounded-2xl border shadow-lg"
        unoptimized
      />
      <Link
        href={siteConfig.applyHref}
        className={buttonVariants({
          className: "absolute bottom-4 right-4 gap-2 shadow-lg",
        })}
      >
        Apply now
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
