import { cn } from "@/lib/cn";

type DetectedModeCardProps = {
  mode: string | null;
  isLoading?: boolean;
};

type ModePresentation = {
  label: string;
  description: string;
  badgeClassName: string;
};

const MODE_PRESENTATION: Record<string, ModePresentation> = {
  photo: {
    label: "Photo",
    description: "Balanced for denoising and natural detail enhancement.",
    badgeClassName: "bg-sky-100 text-sky-700"
  },
  screenshot: {
    label: "Screenshot",
    description: "Optimized for UI edges, text sharpness, and interface clarity.",
    badgeClassName: "bg-violet-100 text-violet-700"
  },
  document: {
    label: "Document",
    description: "Prioritizes readability with deskew and stronger contrast processing.",
    badgeClassName: "bg-emerald-100 text-emerald-700"
  },
  text_heavy: {
    label: "Text-heavy",
    description: "Tuned to preserve letter edges and improve OCR-readability.",
    badgeClassName: "bg-amber-100 text-amber-700"
  }
};

export function DetectedModeCard({ mode, isLoading = false }: DetectedModeCardProps) {
  const normalized = normalizeMode(mode);
  const presentation = normalized ? MODE_PRESENTATION[normalized] || null : null;

  return (
    <section className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Detected Image Type</h2>
        {isLoading ? (
          <span className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
        ) : (
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em]",
              presentation ? presentation.badgeClassName : "bg-slate-100 text-slate-700"
            )}
          >
            {presentation?.label || "Pending"}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {isLoading
          ? "Analyzing image characteristics to pick the most suitable enhancement strategy."
          : presentation?.description || "Mode will be shown when processing data becomes available."}
      </p>
    </section>
  );
}

function normalizeMode(mode: string | null): string | null {
  if (!mode) {
    return null;
  }

  return mode.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
