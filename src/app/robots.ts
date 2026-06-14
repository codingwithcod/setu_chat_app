import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://setu.theabhipatel.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs/", "/login", "/register"],
        disallow: [
          "/api/",
          "/chat/",
          "/developer/",
          "/settings/",
          "/profile/",
          "/select-username",
          "/oauth/",
          "/auth/",
          "/maintenance",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
