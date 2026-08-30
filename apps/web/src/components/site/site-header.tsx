"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/site/site-config";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {siteConfig.navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-border bg-background/90 shadow-sm backdrop-blur"
          : "border-transparent bg-background",
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src={siteConfig.logo}
            alt={`${siteConfig.name} logo`}
            width={40}
            height={40}
            className="h-10 w-10"
            priority
            unoptimized
          />
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            {siteConfig.name}
          </span>
          <span className="text-lg font-bold tracking-tight sm:hidden">
            {siteConfig.shortName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLinks />
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={siteConfig.portalHref}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Portal
          </Link>
          <Link
            href={siteConfig.applyHref}
            className={buttonVariants({ size: "sm" })}
          >
            Apply Now
          </Link>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="border-t bg-background lg:hidden">
          <nav className="container flex flex-col gap-1 py-3">
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-2 flex gap-2">
              <Link
                href={siteConfig.portalHref}
                onClick={() => setOpen(false)}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "flex-1",
                })}
              >
                Portal
              </Link>
              <Link
                href={siteConfig.applyHref}
                onClick={() => setOpen(false)}
                className={buttonVariants({ size: "sm", className: "flex-1" })}
              >
                Apply Now
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
