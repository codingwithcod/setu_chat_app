"use client";

import Link from "next/link";
import Image from "next/image";
import { Github, Linkedin, Globe } from "lucide-react";
import setuLogo from "@/app/setu-white-tr.png";
import { DevelopedBy } from "@/components/shared/DevelopedBy";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Security", href: "#security" },
    { label: "Download", href: "#download" },
    { label: "Groups", href: "#groups" },
  ],
  Developers: [
    { label: "Public API Docs", href: "/docs/public-api" },
    { label: "MCP Server Docs", href: "/docs/mcp-server" },
    { label: "API Studio", href: "/developer" },
    { label: "GitHub", href: "https://github.com/theabhipatel/setu_chat_app" },
  ],
  Company: [
    { label: "About", href: "https://www.theabhipatel.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/theabhipatel" },
    { label: "GitHub", href: "https://github.com/theabhipatel" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="rounded-xl bg-primary p-1.5 overflow-hidden">
                <Image src={setuLogo} alt="Setu logo" width={24} height={24} className="object-contain" />
              </div>
              <span className="text-xl font-extrabold gradient-text">Setu</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              A modern, real-time chat application built for seamless communication. Created by Abhishek Patel (TheAbhiPatel).
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.linkedin.com/in/theabhipatel"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="LinkedIn - TheAbhiPatel"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/theabhipatel"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="GitHub - TheAbhiPatel"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://www.theabhipatel.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Portfolio - TheAbhiPatel"
              >
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <p className="font-semibold text-sm mb-4">{title}</p>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Setu. All rights reserved.
          </p>
          <DevelopedBy />
        </div>
      </div>
    </footer>
  );
}
