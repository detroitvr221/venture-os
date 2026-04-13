import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/overview",
          "/leads",
          "/proposals",
          "/agents",
          "/seo",
          "/campaigns",
          "/approvals",
          "/billing",
          "/companies",
          "/email",
          "/chat",
          "/calendar",
          "/admin",
          "/settings",
          "/notifications",
          "/ventures",
          "/analytics",
          "/onboarding",
          "/files",
          "/reports",
          "/jobs",
          "/calls",
        ],
      },
    ],
    sitemap: "https://www.thenorthbridgemi.com/sitemap.xml",
  };
}
