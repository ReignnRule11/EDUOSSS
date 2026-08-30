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

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { contact, socials } = siteConfig;

  return (
    <footer className="bg-navy-900 text-navy-50">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src={siteConfig.logo}
              alt={`${siteConfig.name} logo`}
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="text-lg font-bold tracking-tight text-white">
              {siteConfig.name}
            </span>
          </Link>
          <p className="text-sm text-navy-200/80">{siteConfig.tagline}</p>
          <p className="text-sm text-navy-200/80">{siteConfig.description}</p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
            Explore
          </h3>
          <ul className="space-y-2.5">
            {siteConfig.navItems.slice(0, 6).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-navy-200/80 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={siteConfig.applyHref}
                className="text-sm text-navy-200/80 transition-colors hover:text-white"
              >
                Online Application
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
            Contact
          </h3>
          <ul className="space-y-3 text-sm text-navy-200/80">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {contact.addressLine1},<br />
                {contact.addressLine2}, {contact.city}, {contact.country}
              </span>
            </li>
            <li>
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {contact.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
            Follow us
          </h3>
          <p className="mb-4 text-sm text-navy-200/80">
            Stay up to date with school life and announcements.
          </p>
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-primary hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
          <Link
            href={siteConfig.applyHref}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline"
          >
            Apply for admission <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-navy-200/70 sm:flex-row">
          <p>
            &copy; {year} {siteConfig.name}. All rights reserved.
          </p>
          <p>
            {contact.officeHours} &middot;{" "}
            <Link href="/faq" className="hover:text-white">
              FAQ
            </Link>{" "}
            &middot;{" "}
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
