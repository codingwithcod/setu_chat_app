import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TechShowcase from "@/components/landing/TechShowcase";
import RealtimeSection from "@/components/landing/RealtimeSection";
import SecuritySection from "@/components/landing/SecuritySection";
import DownloadSection from "@/components/landing/DownloadSection";
import GroupsSection from "@/components/landing/GroupsSection";
import APISection from "@/components/landing/APISection";
import McpSection from "@/components/landing/McpSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import ScrollAnimationProvider from "@/components/shared/ScrollAnimationProvider";
import { HomeJsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <ScrollAnimationProvider>
      <HomeJsonLd />
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <Navbar />
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <TechShowcase />
        <RealtimeSection />
        <SecuritySection />
        <DownloadSection />
        <GroupsSection />
        <APISection />
        <McpSection />
        <TestimonialsSection />
        <CTASection />
        <Footer />
      </div>
    </ScrollAnimationProvider>
  );
}
