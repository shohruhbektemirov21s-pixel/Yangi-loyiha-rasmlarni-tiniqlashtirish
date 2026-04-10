"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Container } from "@/components/layout/Container";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useBillingOverview } from "@/hooks/useBillingOverview";
import { useProcessingHistory } from "@/hooks/useProcessingHistory";
import { useTranslation } from "@/hooks/useTranslation";
import { ProcessingHistoryItem } from "@/lib/api/imageJobs";

import { HistoryCard } from "./HistoryCard";

export function HistoryDashboardView() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    overview,
    isLoading: isBillingLoading,
    error: billingError,
    refresh: refreshBilling
  } = useBillingOverview({
    authToken: token,
    enabled: isAuthenticated && Boolean(token)
  });
  const { items, total, isLoading, isRefreshing, deletingIds, error, refresh, removeHistoryItem } =
    useProcessingHistory({
      limit: 24,
      authToken: token,
      enabled: isAuthenticated && Boolean(token)
    });
  const { success, error: errorToast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/login?next=%2Fdashboard");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const handleDelete = async (item: ProcessingHistoryItem) => {
    const confirmed = window.confirm(
      t.dashDeleteConfirm.replace("{name}", item.originalFilename || "")
    );
    if (!confirmed) {
      return;
    }

    try {
      await removeHistoryItem(item.id);
      success(t.dashToastDeletedTitle, t.dashToastDeletedDesc);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : t.dashToastDeleteFail;
      errorToast(t.dashToastDeleteFail, message);
    }
  };

  return (
    <main className="page-noise min-h-screen py-10 sm:py-14">
      <Container>
        <section className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                {t.dashEyebrow}
              </p>
              <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{t.dashTitle}</h1>
              <p className="mt-2 text-sm text-slate-500">{t.dashSubtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void refresh();
                  void refreshBilling();
                }}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft transition hover:bg-slate-50"
              >
                {isRefreshing ? t.dashRefreshing : t.dashRefresh}
              </button>
              <Link
                href="/#upload-studio"
                className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-slate-900"
              >
                {t.dashUploadNew}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft transition hover:bg-slate-50"
              >
                {t.dashManagePlan}
              </Link>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {t.dashTotalItems}: <span className="font-semibold text-ink">{total}</span>
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-inset">
            <div className="flex flex-wrap items-center gap-3">
              {overview?.usage ? (
                <>
                  <p className="text-sm text-slate-600">
                    {t.dashDailyUsage}:{" "}
                    <span className="font-semibold text-ink">
                      {overview.usage.uploadsUsed}/{overview.usage.uploadsLimit}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {t.dashRemaining}:{" "}
                    <span className="font-semibold text-ink">{overview.usage.uploadsRemaining}</span>
                  </p>
                </>
              ) : isBillingLoading ? (
                <p className="text-sm text-slate-500">{t.dashLoadingPlan}</p>
              ) : (
                <p className="text-sm text-slate-500">{t.dashPlanUnavailable}</p>
              )}
            </div>
            {billingError ? <p className="mt-2 text-xs text-red-600">{billingError}</p> : null}
          </div>
        </section>

        {error ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-soft">
            <p className="font-semibold">{t.dashErrLoad}</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : null}

        {isAuthLoading || isLoading ? (
          <HistorySkeleton />
        ) : items.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-white/80 bg-white/85 p-10 text-center shadow-soft">
            <h2 className="font-display text-2xl text-ink">{t.dashNoHistory}</h2>
            <p className="mt-3 text-sm text-slate-600">{t.dashNoHistoryDesc}</p>
            <div className="mt-6">
              <Link
                href="/#upload-studio"
                className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-slate-900"
              >
                {t.dashProcessFirst}
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                isDeleting={Boolean(deletingIds[item.id])}
                onDelete={(historyItem) => void handleDelete(historyItem)}
              />
            ))}
          </section>
        )}
      </Container>
    </main>
  );
}

function HistorySkeleton() {
  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <article key={index} className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-soft">
          <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />
            <div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-8 w-20 animate-pulse rounded-full bg-slate-100" />
            <div className="h-8 w-16 animate-pulse rounded-full bg-slate-100" />
          </div>
        </article>
      ))}
    </section>
  );
}
