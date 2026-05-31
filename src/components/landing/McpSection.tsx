"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Plug,
  Boxes,
  Bot,
  Code2,
  MessageSquare,
  Sparkles,
  Send,
  Search,
  Users,
  Upload,
  FolderOpen,
  Zap,
} from "lucide-react";
import setuLogo from "@/app/setu-white-tr.png";

/* ---- Client nodes around the hub (percentage positions matching the SVG viewBox) ---- */
const NODES = [
  { name: "Claude", icon: Bot, left: "12%", top: "16%", x: 48, y: 48 },
  { name: "Cursor", icon: Code2, left: "88%", top: "16%", x: 352, y: 48 },
  { name: "ChatGPT", icon: MessageSquare, left: "12%", top: "84%", x: 48, y: 252 },
  { name: "Any Agent", icon: Sparkles, left: "88%", top: "84%", x: 352, y: 252 },
];

const HUB = { x: 200, y: 150 };

/* ---- Tools that "light up" — sampled from the full tool set ---- */
const TOOL_CHIPS = [
  { icon: Send, label: "send_message" },
  { icon: Search, label: "search_users" },
  { icon: FolderOpen, label: "list_conversations" },
  { icon: Users, label: "create_group" },
  { icon: Upload, label: "upload_file" },
  { icon: MessageSquare, label: "list_messages" },
];

export default function McpSection() {
  return (
    <section id="mcp" className="relative py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-primary/[0.03]" />
      <div className="absolute inset-0 tech-grid opacity-30" />

      {/* Floating accents */}
      <div className="absolute top-16 right-[8%] animate-float text-primary/15">
        <Plug className="w-14 h-14 rotate-12" />
      </div>
      <div className="absolute bottom-24 left-[6%] animate-float-slow text-primary/15">
        <Boxes className="w-12 h-12 -rotate-6" />
      </div>

      {/* Orbs */}
      <div className="orb w-[500px] h-[500px] bg-primary/8 -top-40 left-0" />
      <div className="orb w-[400px] h-[400px] bg-violet-500/8 bottom-0 -right-40" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20 animate-on-scroll">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Plug className="h-3.5 w-3.5" />
            Model Context Protocol
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Plug into <span className="gradient-text-hero">any AI agent</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect Claude, Cursor, ChatGPT, or your own agent to Setu over MCP. One hosted URL, your existing
            API key — and every messaging action becomes a tool the AI can call.
          </p>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Left — connection hub animation */}
          <div className="animate-on-scroll-left flex justify-center">
            <div className="relative w-full max-w-[440px]">
              <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-3xl scale-90" />
              <div className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-6 sm:p-8 overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white">
                    <Plug className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold">Setu MCP Server</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 ml-auto">
                    live
                  </span>
                </div>

                {/* Hub diagram */}
                <div className="relative w-full aspect-[4/3]">
                  {/* SVG connection layer */}
                  <svg
                    className="absolute inset-0 w-full h-full text-primary"
                    viewBox="0 0 400 300"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {NODES.map((n, i) => {
                      const d = `M${HUB.x} ${HUB.y} L${n.x} ${n.y}`;
                      return (
                        <g key={n.name}>
                          {/* base spoke */}
                          <path d={d} stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
                          {/* flowing dashes */}
                          <path
                            d={d}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            opacity="0.55"
                            className="mcp-flow"
                            style={{ animationDelay: `${i * 0.3}s` }}
                          />
                          {/* traveling pulse dot */}
                          <circle r="3" fill="currentColor">
                            <animateMotion dur="2s" begin={`${i * 0.5}s`} repeatCount="indefinite" path={d} />
                          </circle>
                        </g>
                      );
                    })}
                    {/* hub rings */}
                    <circle cx={HUB.x} cy={HUB.y} r="26" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <circle cx={HUB.x} cy={HUB.y} r="40" stroke="currentColor" strokeWidth="1" opacity="0.12" />
                  </svg>

                  {/* Central hub node (HTML overlay) */}
                  <div
                    className="absolute mcp-node-pulse"
                    style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
                  >
                    <div className="relative">
                      <span className="absolute inset-0 rounded-2xl bg-primary/30 pulse-ring" />
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-xl shadow-primary/30 overflow-hidden p-2">
                        <Image src={setuLogo} alt="Setu logo" width={32} height={32} className="object-contain" />
                      </div>
                    </div>
                  </div>

                  {/* Client nodes */}
                  {NODES.map((n, i) => (
                    <div
                      key={n.name}
                      className="absolute mcp-node-pulse flex flex-col items-center gap-1"
                      style={{ left: n.left, top: n.top, transform: "translate(-50%, -50%)", animationDelay: `${i * 0.4}s` }}
                    >
                      <div className="w-11 h-11 rounded-xl border border-border/60 bg-card flex items-center justify-center shadow-md">
                        <n.icon className="w-5 h-5 text-foreground/80" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{n.name}</span>
                    </div>
                  ))}
                </div>


              </div>
            </div>
          </div>

          {/* Right — copy + tool chips + CTA */}
          <div className="animate-on-scroll-right space-y-6">
            <div className="space-y-4">
              {[
                { icon: Plug, title: "One hosted endpoint", desc: "No install. Add a single URL to your client and you're connected." },
                { icon: Boxes, title: "Every action as a tool", desc: "Send messages, manage groups, search users, upload files, and more." },
                { icon: Zap, title: "Your key, your scopes", desc: "Reuses your API key — same permissions and rate limits as the REST API." },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tool chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              {TOOL_CHIPS.map((t, i) => (
                <div
                  key={t.label}
                  className="mcp-chip-glow flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/40 px-2.5 py-1.5"
                  style={{ animationDelay: `${i * 0.5}s` }}
                >
                  <t.icon className="h-3.5 w-3.5 text-primary" />
                  <code className="text-[11px] font-mono text-muted-foreground">{t.label}</code>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href="/docs/mcp-server">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-violet-500 text-white border-0 font-semibold gap-2 shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 px-8"
                >
                  <Plug className="h-4 w-4" />
                  Connect via MCP
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
