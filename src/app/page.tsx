"use client";

import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import RealtimeSection from "@/components/landing/RealtimeSection";
import SecuritySection from "@/components/landing/SecuritySection";
import DownloadSection from "@/components/landing/DownloadSection";
import GroupsSection from "@/components/landing/GroupsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function Home() {
  useScrollAnimation();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <RealtimeSection />
      <SecuritySection />
      <DownloadSection />
      <GroupsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
