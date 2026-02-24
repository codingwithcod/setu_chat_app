"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Users } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="orb w-[500px] h-[500px] bg-primary/20 -top-40 -left-40" />
      <div className="orb w-[400px] h-[400px] bg-purple-500/15 -bottom-32 -right-32" />
      <div className="orb w-[300px] h-[300px] bg-indigo-400/10 top-1/3 right-1/4" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" />
              Real-time messaging platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1]">
              Connect with{" "}
              <span className="gradient-text-hero">anyone,</span>
              <br />
              <span className="gradient-text-hero">anywhere</span> instantly
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Setu is a premium, enterprise-grade chat application with private
              & group messaging, real-time presence, and end-to-end security.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base font-semibold gap-2 w-full sm:w-auto">
                  Start Chatting Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium w-full sm:w-auto">
                  Explore Features
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-8 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                Secure by default
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Groups & 1-on-1
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Blazing fast
              </div>
            </div>
          </div>

          {/* Right — Chat mockup */}
          <div className="hidden lg:flex justify-center">
            <div className="relative animate-float">
              <div className="w-[380px] rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden shimmer-border">
                {/* Mockup header */}
                <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold">S</div>
                  <div>
                    <p className="font-semibold text-sm">Setu Team</p>
                    <p className="text-xs text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Online
                    </p>
                  </div>
                </div>
                {/* Mockup messages */}
                <div className="p-4 space-y-3 min-h-[260px]">
                  <div className="chat-bubble-animate flex justify-start" style={{ animationDelay: "0.2s" }}>
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 max-w-[75%]">
                      <p className="text-sm">Hey! Welcome to Setu 🎉</p>
                      <p className="text-[10px] text-muted-foreground mt-1">10:30 AM</p>
                    </div>
                  </div>
                  <div className="chat-bubble-animate flex justify-end" style={{ animationDelay: "0.6s" }}>
                    <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 max-w-[75%]">
                      <p className="text-sm">This looks amazing! 🚀</p>
                      <p className="text-[10px] text-primary-foreground/70 mt-1">10:31 AM</p>
                    </div>
                  </div>
                  <div className="chat-bubble-animate flex justify-start" style={{ animationDelay: "1s" }}>
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 max-w-[75%]">
                      <p className="text-sm">Try the group chat feature! 👥</p>
                      <p className="text-[10px] text-muted-foreground mt-1">10:31 AM</p>
                    </div>
                  </div>
                  <div className="chat-bubble-animate flex justify-end" style={{ animationDelay: "1.4s" }}>
                    <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 max-w-[75%]">
                      <p className="text-sm">On it! Love the design ✨</p>
                      <p className="text-[10px] text-primary-foreground/70 mt-1">10:32 AM</p>
                    </div>
                  </div>
                </div>
                {/* Mockup input */}
                <div className="border-t border-border/50 px-4 py-3 flex items-center gap-2">
                  <div className="flex-1 rounded-full bg-muted/50 px-4 py-2 text-xs text-muted-foreground">Type a message...</div>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <ArrowRight className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
