"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { resolveBackendPublicUrl } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type ResultActionsProps = {
  enhancedImageUrl: string | null;
  disabled?: boolean;
};

export function ResultActions({ enhancedImageUrl, disabled = false }: ResultActionsProps) {
  const { t } = useTranslation();
  const canDownload = Boolean(enhancedImageUrl) && !disabled;

  const forceDownload = async (url: string, defaultFilename: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {canDownload ? (
        <button
          onClick={() => {
            if (!enhancedImageUrl) return;
            const absolute = resolveBackendPublicUrl(enhancedImageUrl);
            if (!absolute) return;
            const dot = enhancedImageUrl.lastIndexOf(".");
            const ext = dot >= 0 ? enhancedImageUrl.substring(dot) : "";
            void forceDownload(absolute, `enhanced_image${ext || ".webp"}`);
          }}
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-slate-900"
        >
          {t.dlBtn || "Yuklab olish ⬇"}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className={cn(
            "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold",
            "cursor-not-allowed bg-slate-200 text-slate-500"
          )}
        >
          {t.dlBtn || "Yuklab olish ⬇"}
        </button>
      )}

      <Link
        href="/#upload-studio"
        className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:bg-slate-50"
      >
        Yangi rasm
      </Link>
    </div>
  );
}
