import Image from "next/image";

import { cn } from "@/lib/cn";

type ResultImageCardProps = {
  title: string;
  imageUrl: string | null;
  description: string;
  isLoading?: boolean;
};

export function ResultImageCard({ title, imageUrl, description, isLoading = false }: ResultImageCardProps) {
  return (
    <article className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-soft">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</h3>

      <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200">
        {isLoading ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            <p className="text-sm font-medium text-slate-600">Processing image...</p>
          </div>
        ) : null}

        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className={cn("object-cover", isLoading ? "opacity-80" : "")}
            sizes="(max-width: 1024px) 100vw, 50vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">{description}</div>
        )}
      </div>
    </article>
  );
}
