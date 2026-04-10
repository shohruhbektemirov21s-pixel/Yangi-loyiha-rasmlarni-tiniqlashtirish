"use client";

import Image from "next/image";
import Link from "next/link";

import { translations, useTranslation, type Lang } from "@/hooks/useTranslation";
import { ProcessingHistoryItem } from "@/lib/api/imageJobs";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";

type HistoryCardProps = {
  item: ProcessingHistoryItem;
  isDeleting?: boolean;
  onDelete: (item: ProcessingHistoryItem) => void;
};

export function HistoryCard({ item, isDeleting = false, onDelete }: HistoryCardProps) {
  const { t, lang } = useTranslation();
  const createdAtLabel = formatDate(item.processingCompletedAt || item.createdAt, lang, t.histDateUnavail);
  const statusLabel = translateStatus(item.status, t);
  const modeLabel = normalizeModeLabel(item.detectedMode);

  return (
    <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="max-w-[220px] truncate text-sm font-semibold text-ink">{item.originalFilename}</p>
          <p className="mt-1 text-xs text-slate-500">{createdAtLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-700">
            {statusLabel}
          </span>
          {modeLabel ? (
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-brand-700">
              {modeLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <HistoryPreviewBox title={t.histOriginal} imageUrl={item.originalImageUrl} emptyLabel={t.histNotAvail} />
        <HistoryPreviewBox title={t.histEnhanced} imageUrl={item.enhancedImageUrl} emptyLabel={t.histNotAvail} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {item.sizeBytes ? <span>{formatBytes(item.sizeBytes)}</span> : null}
        {item.contentType ? <span>{item.contentType}</span> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/result/${item.id}`}
          className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-900"
        >
          {t.histOpenResult}
        </Link>
        {item.enhancedImageUrl ? (
          <a
            href={item.enhancedImageUrl}
            download
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-soft transition hover:bg-slate-50"
          >
            {t.histDownload}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={isDeleting}
          className={cn(
            "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition",
            isDeleting
              ? "cursor-not-allowed bg-red-100 text-red-400"
              : "bg-red-50 text-red-700 hover:bg-red-100"
          )}
        >
          {isDeleting ? t.histDeleting : t.histDelete}
        </button>
      </div>
    </article>
  );
}

type HistoryPreviewBoxProps = {
  title: string;
  imageUrl: string | null;
  emptyLabel: string;
};

function HistoryPreviewBox({ title, imageUrl, emptyLabel }: HistoryPreviewBoxProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2">
      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</p>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-b from-slate-100 to-slate-200">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">{emptyLabel}</div>
        )}
      </div>
    </div>
  );
}

function formatDate(input: string | null, lang: Lang, fallback: string): string {
  if (!input) {
    return fallback;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
  return date.toLocaleString(locale);
}

type TranslationBundle = (typeof translations)["uz"];

function translateStatus(status: string, t: TranslationBundle): string {
  const key = status.toLowerCase().replace(/[\s-]+/g, "_");
  const map: Record<string, string> = {
    uploaded: t.histStatusUploaded,
    processing: t.histStatusProcessing,
    completed: t.histStatusCompleted,
    failed: t.histStatusFailed
  };
  return map[key] || t.histStatusUnknown;
}

function normalizeModeLabel(mode: string | null): string | null {
  if (!mode) {
    return null;
  }

  return mode.replace(/_/g, " ");
}
