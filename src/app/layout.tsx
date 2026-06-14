import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastContainer } from "@/components/shared/ToastContainer";
import { ThemeColorProvider } from "@/components/shared/ThemeColorProvider";
import TauriDeepLinkHandler from "@/components/auth/TauriDeepLinkHandler";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({ subsets: ["latin"] });

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://setu.theabhipatel.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default:
      "Setu - Modern Chat Application by TheAbhiPatel | Real-Time Messaging",
    template: "%s | Setu Chat App",
  },
  description:
    "Setu is a modern, real-time chat application built by Abhishek Patel (TheAbhiPatel). Features private and group messaging, MCP server, public REST API, OAuth 2.1, webhooks, and end-to-end security.",
  keywords: [
    "setu",
    "setu chat",
    "setu chat application",
    "setu chat app",
    "setu app",
    "setu by theabhipatel",
    "setu theabhipatel",
    "setu abhishek patel",
    "setu abhi patel",
    "theabhipatel",
    "TheAbhiPatel",
    "abhishek patel",
    "abhi patel",
    "real-time chat",
    "messaging app",
    "group chat",
    "mcp server",
    "model context protocol",
    "chat api",
    "messaging api",
    "setu docs",
    "setu documentation",
    "setu mcp",
    "next.js chat app",
    "supabase chat",
    "open source chat",
  ],
  authors: [
    { name: "Abhishek Patel", url: "https://www.theabhipatel.com/" },
  ],
  creator: "TheAbhiPatel",
  publisher: "Abhishek Patel",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Setu Chat Application",
    title: "Setu - Modern Chat Application by TheAbhiPatel",
    description:
      "Real-time chat application with private and group messaging, MCP server, and public API. Built by Abhishek Patel (TheAbhiPatel).",
    url: baseUrl,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Setu - Modern Chat Application by TheAbhiPatel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Setu - Modern Chat Application by TheAbhiPatel",
    description:
      "Real-time messaging with MCP server, API, OAuth 2.1 and more. Built by Abhishek Patel (TheAbhiPatel).",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icons/setu-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/setu-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/setu-192x192.png",
    apple: "/apple-icon.png",
  },
  alternates: {
    canonical: baseUrl,
  },
  other: {
    "linkedin:owner": "theabhipatel",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColorProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <ToastContainer />
              <TauriDeepLinkHandler />
            </TooltipProvider>
          </ThemeColorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
