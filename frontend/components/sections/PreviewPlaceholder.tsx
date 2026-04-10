"use client";

import Image from "next/image";

import { cn } from "@/lib/cn";

type PreviewCardProps = {
  title: string;
  description: string;
  imageUrl?: string | null;
  blurred?: boolean;
  isLoading?: boolean;
};

function PreviewCard({ title, description, imageUrl, blurred, isLoading }: PreviewCardProps) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</h4>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200">
        {isLoading ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            <p className="text-sm font-medium text-slate-600">Enhancement in progress...</p>
          </div>
        ) : null}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className={cn("object-cover", blurred ? "blur-[1.6px]" : "")}
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">{description}</div>
        )}
      </div>
    </div>
  );
}

type PreviewPlaceholderProps = {
  originalPreviewUrl?: string | null;
  enhancedPreviewUrl?: string | null;
  isProcessing?: boolean;
};

import { useTranslation } from "@/hooks/useTranslation";

export function PreviewPlaceholder({
  originalPreviewUrl,
  enhancedPreviewUrl,
  isProcessing = false
}: PreviewPlaceholderProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PreviewCard
        title={t.prOriginal}
        description={t.prOriginalD}
        imageUrl={originalPreviewUrl}
        blurred={Boolean(originalPreviewUrl)}
      />
      <PreviewCard
        title={t.prAfter}
        description={t.prAfterD}
        imageUrl={enhancedPreviewUrl}
        isLoading={isProcessing}
      />
    </div>
  );
}
