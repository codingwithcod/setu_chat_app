"use client";

import { Monitor, Globe, Download, ArrowRight, Smartphone, Laptop, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const platforms = [
  {
    name: "Android",
    desc: "Google Play Store",
    icon: (
      <svg className="h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.523 2.236l-2.088 3.611a7.963 7.963 0 00-3.435-.78 7.96 7.96 0 00-3.435.78L6.477 2.236a.476.476 0 00-.653-.174.476.476 0 00-.174.653l2.06 3.562A8.04 8.04 0 004 12.68h16A8.04 8.04 0 0018.29 6.277l2.06-3.562a.476.476 0 00-.174-.653.476.476 0 00-.653.174zM8.5 10.5a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2zM4 13.68v7a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-7H4zm13 0v7a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-7h-4zm-9 0v8.5a1.5 1.5 0 001.5 1.5h5a1.5 1.5 0 001.5-1.5v-8.5H8zM2.5 12.68a1.5 1.5 0 00-1.5 1.5v5a1.5 1.5 0 003 0v-5a1.5 1.5 0 00-1.5-1.5zm19 0a1.5 1.5 0 00-1.5 1.5v5a1.5 1.5 0 003 0v-5a1.5 1.5 0 00-1.5-1.5z" />
      </svg>
    ),
    gradient: "from-[#3DDC84] to-[#20B261]",
    bgGlow: "bg-[#3DDC84]/10",
    shadowColor: "shadow-[#3DDC84]/20",
    tag: "APK",
  },
  {
    name: "iOS",
    desc: "App Store",
    icon: (
      <svg className="h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    gradient: "from-[#007AFF] to-[#5856D6]",
    bgGlow: "bg-[#007AFF]/10",
    shadowColor: "shadow-[#007AFF]/20",
    tag: "iPhone & iPad",
  },
  {
    name: "Windows",
    desc: "Windows 10 / 11",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
    gradient: "from-[#00BCF2] to-[#0078D4]",
    bgGlow: "bg-[#00BCF2]/10",
    shadowColor: "shadow-[#00BCF2]/20",
    tag: ".exe",
  },
  {
    name: "macOS",
    desc: "macOS 12+",
    icon: (
      <svg className="h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    gradient: "from-[#A855F7] to-[#7C3AED]",
    bgGlow: "bg-[#A855F7]/10",
    shadowColor: "shadow-[#A855F7]/20",
    tag: ".dmg",
  },
  {
    name: "Linux",
    desc: ".deb & .AppImage",
    icon: (
      <svg className="h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.296 1.884 1.396.39.05.844-.083 1.233-.334.45-.307.838-.924.958-1.848.221-.002.45-.036.679-.134.606-.26.858-.852.858-1.437 0-.546-.16-1.09-.37-1.583-.218-.506-.47-.975-.626-1.37a3.65 3.65 0 01-.143-.523c-.07-.433.076-.94.37-1.726.273-.736.617-1.64.555-2.79-.064-1.173-.755-2.378-1.832-3.403-.697-.665-1.413-1.165-2.025-1.78-.697-.624-1.095-1.37-1.36-2.205-.144-.485-.187-1.437-.18-2.075-.02-1.813-.355-3.66-1.67-4.746C14.253.183 13.398 0 12.504 0z" />
      </svg>
    ),
    gradient: "from-[#F59E0B] to-[#EF4444]",
    bgGlow: "bg-[#F59E0B]/10",
    shadowColor: "shadow-[#F59E0B]/20",
    tag: ".deb",
  },
];

export default function DownloadSection() {
  return (
    <section id="download" className="relative py-28 overflow-hidden">
      {/* Background tech grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="orb w-[600px] h-[600px] bg-violet-500/8 top-0 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20 animate-on-scroll">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Smartphone className="h-3.5 w-3.5" />
            Cross-platform
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Available on <span className="gradient-text-hero">every platform</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Use Setu on your phone, desktop, or right in your browser. Your conversations sync seamlessly across all devices.
          </p>
        </div>

        {/* Desktop/mobile native cards — premium redesign */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-12">
          {platforms.map((p, i) => (
            <div
              key={p.name}
              className={`animate-on-scroll group relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-transparent hover:shadow-2xl ${p.shadowColor}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Gradient top bar */}
              <div className={`h-1.5 bg-gradient-to-r ${p.gradient} transition-all duration-500 group-hover:h-2`} />
              
              <div className="p-6 flex flex-col items-center text-center gap-4">
                {/* Icon with glow ring */}
                <div className="relative">
                  <div className={`absolute inset-0 rounded-2xl ${p.bgGlow} scale-150 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    {p.icon}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>

                {/* Tag pill */}
                <span className={`text-[10px] font-mono font-semibold px-3 py-1 rounded-full ${p.bgGlow} text-foreground/80 border border-border/30`}>
                  {p.tag}
                </span>

                {/* Download button */}
                <Button
                  size="sm"
                  className={`w-full bg-gradient-to-r ${p.gradient} text-white border-0 font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] gap-2`}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Web app highlight card — spanning full width */}
        <div className="animate-on-scroll-scale">
          <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/5 via-card/80 to-purple-500/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,hsl(var(--primary)/0.08),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,hsl(280_70%_60%/0.06),transparent_50%)]" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white shadow-xl shadow-primary/25">
                  <Globe className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">Web Application</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      No install needed
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Open Setu directly in your browser — works on Chrome, Firefox, Safari, Edge & more. Full-featured, zero downloads.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 flex-shrink-0">
                <Button size="lg" className="bg-gradient-to-r from-primary to-violet-600 text-white font-semibold gap-2 shadow-xl shadow-primary/25 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-0 px-8">
                  <ExternalLink className="h-4 w-4" />
                  Launch Web App
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sync indicator */}
        <div className="flex items-center justify-center gap-3 mt-10 animate-on-scroll">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
            <Laptop className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.6s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.8s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "1s" }} />
            </div>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Syncs in real-time across all your devices</p>
        </div>
      </div>
    </section>
  );
}
