"use client";

import {
  MessageSquare,
  Users,
  Search,
  Paperclip,
  Bell,
  Smile,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Real-Time Messaging",
    description: "Instant message delivery with live sync, typing indicators, and read receipts powered by Supabase Realtime.",
    gradient: "from-primary/20 to-purple-500/20",
    iconColor: "text-primary",
  },
  {
    icon: Users,
    title: "Group Conversations",
    description: "Create groups, assign roles, add or remove members, pin messages, and manage your community effortlessly.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: Search,
    title: "Instant Search",
    description: "Find users by username or name with debounced, lightning-fast partial-match search powered by indexed queries.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Paperclip,
    title: "File & Image Sharing",
    description: "Share images, documents, and files directly in chat. Preview before sending with secure signed-URL access.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: Smile,
    title: "Emoji & Reactions",
    description: "Express yourself with an emoji picker, message reactions, @mentions, and forward, reply, or edit messages.",
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-500",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "In-app notifications, unread counters, and browser push notifications so you never miss a message.",
    gradient: "from-violet-500/20 to-indigo-500/20",
    iconColor: "text-violet-500",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 overflow-hidden">
      {/* Background accent */}
      <div className="orb w-[600px] h-[600px] bg-primary/10 -top-60 -right-60" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Everything you need in a{" "}
            <span className="gradient-text-hero">modern chat app</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From real-time messaging to rich media sharing, Setu packs every feature you expect — and more.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`animate-on-scroll landing-card rounded-2xl p-6 sm:p-8 group ${
                i === 0 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                <f.icon className={`h-6 w-6 ${f.iconColor}`} />
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
