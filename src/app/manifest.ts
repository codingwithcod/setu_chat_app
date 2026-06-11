import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Setu - Modern Chat Application by TheAbhiPatel",
    short_name: "Setu",
    description:
      "Setu is a modern, real-time chat application with private and group messaging, MCP server, and public API. Built by Abhishek Patel (TheAbhiPatel).",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icons/setu-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/setu-badge.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
