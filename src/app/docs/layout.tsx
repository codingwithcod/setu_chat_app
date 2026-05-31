"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";
import { Sun, Moon, ArrowLeft, BookOpen, Plug } from "lucide-react";
import setuLogo from "@/app/setu-white-tr.png";

const TABS = [
  { href: "/docs/public-api", label: "Public API", icon: BookOpen },
  { href: "/docs/mcp-server", label: "MCP Server", icon: Plug },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-border bg-sidebar/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Left — Logo + Brand */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="rounded-xl bg-primary p-1.5 transition-transform group-hover:scale-110 overflow-hidden">
                  <Image
                    src={setuLogo}
                    alt="Setu logo"
                    width={22}
                    height={22}
                    className="object-contain"
                  />
                </div>
                <span className="text-lg font-extrabold gradient-text hidden sm:inline">
                  Setu
                </span>
              </Link>

              {/* Separator */}
              <div className="hidden sm:block w-px h-6 bg-border" />

              {/* Documentation label */}
              <span className="hidden sm:inline text-sm font-semibold text-muted-foreground">
                Documentation
              </span>
            </div>

            {/* Center — Tab switcher */}
            <nav className="flex items-center gap-1 rounded-xl bg-muted/50 p-1 border border-border/50">
              {TABS.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <button
                    key={tab.href}
                    onClick={() => router.push(tab.href)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right — Actions */}
            <div className="flex items-center gap-2">
              {mounted && (
                <button
                  aria-label="Toggle theme"
                  onClick={() =>
                    setTheme(theme === "dark" ? "light" : "dark")
                  }
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
              )}
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
