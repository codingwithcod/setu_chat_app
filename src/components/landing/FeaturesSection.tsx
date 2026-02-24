"use client";

import {
  MessageSquare,
  Users,
  Search,
  Paperclip,
  Bell,
  Smile,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Real-Time Messaging",
    description: "Instant message delivery with live sync, typing indicators, and read receipts powered by Supabase Realtime.",
    gradient: "from-primary to-purple-500",
    bgGlow: "from-primary/20 to-purple-500/20",
    iconColor: "text-white",
    tag: "Core",
  },
  {
    icon: Users,
    title: "Group Conversations",
    description: "Create groups, assign roles, add or remove members, pin messages, and manage your community effortlessly.",
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-white",
    tag: "Social",
  },
  {
    icon: Search,
    title: "Instant Search",
    description: "Find users by username or name with debounced, lightning-fast partial-match search powered by indexed queries.",
    gradient: "from-blue-500 to-cyan-500",
    bgGlow: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-white",
    tag: "Utility",
  },
  {
    icon: Paperclip,
    title: "File & Image Sharing",
    description: "Share images, documents, and files directly in chat. Preview before sending with secure signed-URL access.",
    gradient: "from-amber-500 to-orange-500",
    bgGlow: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-white",
    tag: "Media",
  },
  {
    icon: Smile,
    title: "Emoji & Reactions",
    description: "Express yourself with an emoji picker, message reactions, @mentions, and forward, reply, or edit messages.",
    gradient: "from-pink-500 to-rose-500",
    bgGlow: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-white",
    tag: "Expression",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "In-app notifications, unread counters, and browser push notifications so you never miss a message.",
    gradient: "from-violet-500 to-indigo-500",
    bgGlow: "from-violet-500/20 to-indigo-500/20",
    iconColor: "text-white",
    tag: "Alerts",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 overflow-hidden">
      {/* Background accent */}
      <div className="orb w-[600px] h-[600px] bg-primary/10 -top-60 -right-60" />
      <div className="absolute inset-0 tech-grid opacity-50" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Packed with features
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Everything you need in a{" "}
            <span className="gradient-text-hero">modern chat app</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From real-time messaging to rich media sharing, Setu packs every feature you expect — and more.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-on-scroll group relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-7 overflow-hidden transition-all duration-500 hover:border-transparent hover:shadow-2xl"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {/* Top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              {/* Background glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${f.bgGlow} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />

              <div className="relative z-10">
                {/* Tag + icon row */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-xl`}>
                    <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/30">
                    {f.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold mb-2 group-hover:text-foreground transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{f.description}</p>
                
                {/* Learn more arrow */}
                <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  Learn more <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
