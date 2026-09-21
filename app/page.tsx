import HeroSection from "@/components/HeroSection";
import DemoSection from "@/components/DemoSection";
import StepsSection from "@/components/StepsSection";
import PricingSection from "@/components/PricingSection";
import TrustSection from "@/components/TrustSection";
import LandingTestimonials from "@/components/LandingTestimonials";
import FaqSection from "@/components/FaqSection";
import FinalCta from "@/components/FinalCta";
import LandingFooter from "@/components/LandingFooter";
import BackToTop from "@/components/BackToTop";
import LandingNavbar from "@/components/LandingNavbar";

export default function HomePage() {
  return (
    <div className="landing-light min-h-screen">
      <LandingNavbar />
      <main>
        {/* Hero — above the fold: headline, subhead, single CTA only */}
        <HeroSection />

        <DemoSection />

        <StepsSection />

        <PricingSection />

        <TrustSection />

        <LandingTestimonials />

        <FaqSection />

        <FinalCta />
      </main>
      <LandingFooter />
      <BackToTop />
    </div>
  );
}
