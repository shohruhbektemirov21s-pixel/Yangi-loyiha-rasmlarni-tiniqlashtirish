"use client";

import { Container } from "@/components/layout/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { FeatureItem } from "@/data/features";
import { useTranslation } from "@/hooks/useTranslation";

export function FeaturesSection() {
  const { t } = useTranslation();

  const dynamicFeatures: FeatureItem[] = [
    {
      title: t.feat1T,
      description: t.feat1D,
      icon: "spark"
    },
    {
      title: t.feat2T,
      description: t.feat2D,
      icon: "text"
    },
    {
      title: t.feat3T,
      description: t.feat3D,
      icon: "scan"
    }
  ];

  return (
    <section id="features" className="pt-14 sm:pt-20">
      <Container>
        <SectionHeading
          eyebrow={t.featuresEye}
          title={t.featuresTitle}
          description={t.featuresDesc}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {dynamicFeatures.map((feature) => (
            <FeatureCard key={feature.title} item={feature} />
          ))}
        </div>
      </Container>
    </section>
  );
}
