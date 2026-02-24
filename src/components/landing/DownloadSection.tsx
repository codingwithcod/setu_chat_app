"use client";

import { Monitor, Globe, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const platforms = [
  {
    name: "Android",
    desc: "Google Play Store",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.523 2.236l-2.088 3.611a7.963 7.963 0 00-3.435-.78 7.96 7.96 0 00-3.435.78L6.477 2.236a.476.476 0 00-.653-.174.476.476 0 00-.174.653l2.06 3.562A8.04 8.04 0 004 12.68h16A8.04 8.04 0 0018.29 6.277l2.06-3.562a.476.476 0 00-.174-.653.476.476 0 00-.653.174zM8.5 10.5a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2zM4 13.68v7a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-7H4zm13 0v7a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-7h-4zm-9 0v8.5a1.5 1.5 0 001.5 1.5h5a1.5 1.5 0 001.5-1.5v-8.5H8zM2.5 12.68a1.5 1.5 0 00-1.5 1.5v5a1.5 1.5 0 003 0v-5a1.5 1.5 0 00-1.5-1.5zm19 0a1.5 1.5 0 00-1.5 1.5v5a1.5 1.5 0 003 0v-5a1.5 1.5 0 00-1.5-1.5z" />
      </svg>
    ),
    gradient: "from-emerald-500/20 to-green-500/20",
    buttonColor: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    name: "iOS",
    desc: "App Store",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    gradient: "from-gray-500/20 to-zinc-500/20",
    buttonColor: "bg-gray-700 hover:bg-gray-800",
  },
  {
    name: "Windows",
    desc: "Windows 10/11",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
    gradient: "from-blue-500/20 to-sky-500/20",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
  },
  {
    name: "macOS",
    desc: "macOS 12+",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    gradient: "from-zinc-500/20 to-neutral-500/20",
    buttonColor: "bg-zinc-700 hover:bg-zinc-800",
  },
  {
    name: "Linux",
    desc: ".deb & .AppImage",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.296 1.884 1.396.39.05.844-.083 1.233-.334.45-.307.838-.924.958-1.848.221-.002.45-.036.679-.134.606-.26.858-.852.858-1.437 0-.546-.16-1.09-.37-1.583-.218-.506-.47-.975-.626-1.37a3.65 3.65 0 01-.143-.523c-.07-.433.076-.94.37-1.726.273-.736.617-1.64.555-2.79-.064-1.173-.755-2.378-1.832-3.403-.697-.665-1.413-1.165-2.025-1.78-.697-.624-1.095-1.37-1.36-2.205-.144-.485-.187-1.437-.18-2.075-.02-1.813-.355-3.66-1.67-4.746C14.253.183 13.398 0 12.504 0z" />
      </svg>
    ),
    gradient: "from-amber-500/20 to-yellow-500/20",
    buttonColor: "bg-amber-600 hover:bg-amber-700",
  },
  {
    name: "Web App",
    desc: "Use in browser",
    icon: <Globe className="h-8 w-8" />,
    gradient: "from-primary/20 to-violet-500/20",
    buttonColor: "bg-primary hover:bg-primary/90",
    isWeb: true,
  },
];

export default function DownloadSection() {
  return (
    <section id="download" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />
      <div className="orb w-[500px] h-[500px] bg-violet-500/8 top-0 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Download</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Available on <span className="gradient-text-hero">every platform</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Use Setu on your phone, desktop, or right in your browser. Your conversations sync seamlessly across all devices.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {platforms.map((p, i) => (
            <div
              key={p.name}
              className={`animate-on-scroll landing-card platform-card rounded-2xl p-5 sm:p-6 text-center flex flex-col items-center gap-4 ${
                p.isWeb ? "shimmer-border" : ""
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                {p.icon}
              </div>
              <div>
                <p className="font-bold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
              <Button
                size="sm"
                className={`w-full text-xs font-semibold text-white ${p.buttonColor}`}
              >
                {p.isWeb ? (
                  <>
                    <Monitor className="h-3 w-3 mr-1" />
                    Open App
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
