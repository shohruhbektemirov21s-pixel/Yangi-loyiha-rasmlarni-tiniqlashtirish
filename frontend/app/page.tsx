
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { CompressPromoSection } from "@/components/sections/CompressPromoSection";
import { RevealOnScroll } from "@/components/animations/RevealOnScroll";

export default function HomePage() {
  return (
    <main className="page-noise">
      <RevealOnScroll delay={0}>
        <HeroSection />
      </RevealOnScroll>

      <RevealOnScroll delay={200}>
        <CompressPromoSection />
      </RevealOnScroll>
      <RevealOnScroll delay={200}>
        <AboutSection />
      </RevealOnScroll>
    </main>
  );
}
