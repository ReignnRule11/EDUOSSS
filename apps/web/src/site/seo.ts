import type { Metadata } from "next";

import { siteConfig } from "./site-config";

interface SeoOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  keywords?: string[];
  absoluteTitle?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  image = siteConfig.logo,
  type = "website",
  keywords = [],
  absoluteTitle = false,
}: SeoOptions): Metadata {
  const url = `${siteConfig.baseUrl}${path}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type,
      images: [{ url: `${siteConfig.baseUrl}${image}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${siteConfig.baseUrl}${image}`],
    },
  };
}
