import ScrollProgressBar from "../components/landing/ScrollProgressBar";
import FloatingOrbs from "../components/landing/FloatingOrbs";
import HeroSection from "../components/landing/HeroSection";
import PhilosophySection from "../components/landing/PhilosophySection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import ShowcaseSection from "../components/landing/ShowcaseSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import SocialProofSection from "../components/landing/SocialProofSection";
import CTASection from "../components/landing/CTASection";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground relative scroll-smooth" style={{ overflowX: "clip" }}>
      <ScrollProgressBar />
      <FloatingOrbs />
      <div className="relative z-[1]">
        <HeroSection />
        <PhilosophySection />
        <HowItWorksSection />
        <ShowcaseSection />
        <FeaturesSection />
        <SocialProofSection />
        <CTASection />
        <LandingFooter />
      </div>
    </div>
  );
}
