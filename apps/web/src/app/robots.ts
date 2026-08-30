import type { MetadataRoute } from "next";

import { siteConfig } from "@/site/site-config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/dashboard", "/api", "/forms"],
    },
    sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
  };
}
