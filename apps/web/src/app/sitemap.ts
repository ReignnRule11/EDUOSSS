import type { MetadataRoute } from "next";

import { newsItems } from "@/site/content/news";
import { siteConfig } from "@/site/site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.baseUrl;
  const now = new Date();

  const staticPages = [
    "",
    "/about",
    "/admissions",
    "/academics",
    "/gallery",
    "/news",
    "/events",
    "/contact",
    "/faq",
    "/apply",
  ];

  const pages = staticPages.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const news = newsItems.map((item) => ({
    url: `${base}/news/${item.slug}`,
    lastModified: new Date(item.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...pages, ...news];
}
