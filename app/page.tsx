import Header from "@/components/header"
import HeroSection from "@/components/hero-section"
import StatsSection from "@/components/stats-section"
import FeaturesSection from "@/components/features-section"
import TemplatesSection from "@/components/templates-section"
import PricingSection from "@/components/pricing-section"
import GeneratorSection from "@/components/generator-section"
import CtaSection from "@/components/cta-section"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <Header />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <TemplatesSection />
      <PricingSection />
      <GeneratorSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
