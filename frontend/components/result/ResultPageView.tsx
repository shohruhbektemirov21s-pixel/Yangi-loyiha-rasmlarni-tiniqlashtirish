"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Container } from "@/components/layout/Container";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useImageJobResult } from "@/hooks/useImageJobResult";

import { DetectedModeCard } from "./DetectedModeCard";
import { ResultActions } from "./ResultActions";
import { ResultImageCard } from "./ResultImageCard";
import { ResultSkeleton } from "./ResultSkeleton";
import { ResultTextCard } from "./ResultTextCard";

type ResultPageViewProps = {
  imageId: string;
};

const PENDING_STATUSES = new Set(["uploaded", "processing"]);

export function ResultPageView({ imageId }: ResultPageViewProps) {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { result, isLoading, isPolling, error, refresh } = useImageJobResult(imageId, {
    authToken: token,
    enabled: isAuthenticated && Boolean(token)
  });
  const { success, error: errorToast, info } = useToast();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(`/result/${imageId}`)}`);
    }
  }, [imageId, isAuthLoading, isAuthenticated, router]);

  const handleCopy = async () => {
    const text = result?.extractedText?.trim() || "";

    if (!text) {
      info("No text to copy", "Extracted text is currently empty.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      success("Text copied", "Extracted text was copied to clipboard.");
    } catch {
      errorToast("Copy failed", "Could not copy text to clipboard.");
    }
  };

  const status = result?.status || "processing";
  const normalizedStatus = status.toLowerCase();
  const isPending = PENDING_STATUSES.has(normalizedStatus);
  const isFailed = normalizedStatus === "failed";
  const showSkeleton = (isLoading && !result) || isAuthLoading;

  return (
    <main className="page-noise min-h-screen py-10 sm:py-14">
      <Container>
        <div className="mb-6 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                Result Workspace
              </p>
              <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Image Processing Result</h1>
              <p className="mt-2 text-sm text-slate-500">Job ID: {imageId}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} isPolling={isPolling} />
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft transition hover:bg-slate-50"
              >
                Refresh
              </button>
              <Link
                href="/#upload-studio"
                className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-slate-900"
              >
                Process another image
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft transition hover:bg-slate-50"
              >
                View history
              </Link>
            </div>
          </div>
        </div>

        {error && !result ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-soft">
            <p className="font-semibold">Could not load the result page data.</p>
            <p className="mt-2 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 inline-flex rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : showSkeleton ? (
          <ResultSkeleton />
        ) : (
          <div className="space-y-6">
            <DetectedModeCard mode={result?.detectedMode || null} isLoading={isPending && !result?.detectedMode} />

            <div className="grid gap-4 lg:grid-cols-2">
              <ResultImageCard
                title="Original"
                imageUrl={result?.originalImageUrl || null}
                description="Original uploaded image will appear here."
              />
              <ResultImageCard
                title="Enhanced"
                imageUrl={result?.enhancedImageUrl || null}
                description="Enhanced image will appear after processing completes."
                isLoading={isPending}
              />
            </div>

            <ResultTextCard
              text={result?.extractedText || ""}
              isLoading={isPending}
              onCopy={() => void handleCopy()}
              canCopy={Boolean(result?.extractedText?.trim())}
            />

            {isFailed ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-soft">
                <p className="font-semibold">Image processing did not complete.</p>
                <p className="mt-1">
                  {result?.errorMessage?.trim() || "An unexpected processing error occurred. Please try another image."}
                </p>
              </div>
            ) : null}

            <ResultActions enhancedImageUrl={result?.enhancedImageUrl || null} disabled={isPending || isFailed} />
          </div>
        )}
      </Container>
    </main>
  );
}

type StatusBadgeProps = {
  status: string;
  isPolling: boolean;
};

function StatusBadge({ status, isPolling }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-brand-700">
        Completed
      </span>
    );
  }

  if (normalized === "failed") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-red-700">
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">
      {(isPolling || normalized === "processing") && (
        <span className="h-3 w-3 animate-spin rounded-full border border-amber-500 border-t-transparent" />
      )}
      Processing
    </span>
  );
}
