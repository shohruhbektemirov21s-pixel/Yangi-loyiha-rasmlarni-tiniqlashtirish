"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useBillingOverview } from "@/hooks/useBillingOverview";
import { PlanCode, PricingPlan } from "@/lib/api/billing";
import { cn } from "@/lib/cn";

const PUBLIC_PRICING_FALLBACK: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    description: "For occasional cleanup and text extraction tasks.",
    monthlyPriceUsd: 0,
    badgeText: "Free",
    outputQualityLabel: "Standard enhancement",
    features: [
      "Limited uploads per day",
      "Standard enhancement pipeline",
      "Standard OCR mode"
    ],
    entitlements: {
      dailyUploadLimit: 10,
      priorityLevel: 1,
      ocrMode: "standard",
      maxOutputShortSide: null
    }
  },
  {
    code: "premium",
    name: "Premium",
    description: "For heavier workloads and higher-quality output needs.",
    monthlyPriceUsd: 19,
    badgeText: "Premium",
    outputQualityLabel: "Higher-resolution output",
    features: [
      "Higher daily upload limit",
      "Priority processing hint",
      "Quality OCR mode with extra variants",
      "Higher-resolution output target"
    ],
    entitlements: {
      dailyUploadLimit: 250,
      priorityLevel: 10,
      ocrMode: "quality",
      maxOutputShortSide: 1400
    }
  }
];

export function PricingPageView() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const { success, error: errorToast, info } = useToast();

  const { overview, isLoading, isUpdating, error, changePlan } = useBillingOverview({
    authToken: token,
    enabled: isAuthenticated && Boolean(token)
  });

  const plans = overview?.plans?.length ? overview.plans : PUBLIC_PRICING_FALLBACK;
  const currentPlan = (overview?.currentPlan || "free").toLowerCase();

  const handlePlanSelect = async (planCode: PlanCode) => {
    const normalizedPlanCode = String(planCode).toLowerCase();

    if (!isAuthenticated || !token) {
      router.push("/login?next=%2Fpricing");
      return;
    }

    if (currentPlan === normalizedPlanCode) {
      info("Already active", "This plan is currently active on your account.");
      return;
    }

    try {
      const result = await changePlan(normalizedPlanCode);
      const notice = result.notice?.trim() || "Plan updated successfully.";
      success("Subscription updated", notice);
    } catch (planError) {
      const message = planError instanceof Error ? planError.message : "Could not update the plan.";
      errorToast("Plan update failed", message);
    }
  };

  return (
    <main className="page-noise min-h-screen py-10 sm:py-14">
      <Container>
        <section className="rounded-[2rem] border border-white/80 bg-white/85 px-6 py-8 shadow-soft sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
              Pricing
            </p>
            <h1 className="mt-4 font-display text-4xl text-ink sm:text-5xl">Choose the right plan for your workflow</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Free keeps everyday enhancement simple. Premium is tuned for heavier usage, higher-resolution output, and
              stronger OCR mode.
            </p>
          </div>

          {isAuthenticated && overview?.usage ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-inset">
              <div className="flex flex-wrap items-center gap-3">
                <PlanBadge planCode={overview.currentPlan} size="md" />
                <p className="text-sm text-slate-600">
                  Today:{" "}
                  <span className="font-semibold text-ink">
                    {overview.usage.uploadsUsed}/{overview.usage.uploadsLimit}
                  </span>{" "}
                  uploads used
                </p>
                <p className="text-sm text-slate-600">
                  Remaining: <span className="font-semibold text-ink">{overview.usage.uploadsRemaining}</span>
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.code.toLowerCase();
            const isPremium = plan.code.toLowerCase() === "premium";

            return (
              <article
                key={plan.code}
                className={cn(
                  "relative rounded-3xl border p-6 shadow-soft transition",
                  isPremium
                    ? "border-amber-200 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/70"
                    : "border-white/80 bg-white/90"
                )}
              >
                {isPremium ? (
                  <div className="absolute -right-1 -top-1 rounded-bl-2xl rounded-tr-3xl bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                    Recommended
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-3xl text-ink">{plan.name}</h2>
                  <PlanBadge planCode={plan.code} />
                </div>

                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-bold text-ink">${plan.monthlyPriceUsd}</span>
                  <span className="pb-1 text-sm text-slate-500">/ month</span>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plan Summary</p>
                  <p className="mt-2 text-sm text-ink">{plan.outputQualityLabel}</p>
                  <p className="mt-1 text-sm text-slate-600">Uploads per day: {plan.entitlements.dailyUploadLimit}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    OCR mode: <span className="font-medium text-ink">{plan.entitlements.ocrMode}</span>
                  </p>
                </div>

                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button
                    disabled={isLoading || isUpdating || isCurrent}
                    onClick={() => void handlePlanSelect(plan.code)}
                    className={cn(
                      "w-full justify-center",
                      isCurrent ? "cursor-not-allowed bg-slate-300 text-slate-600 hover:bg-slate-300" : ""
                    )}
                  >
                    {isCurrent ? "Current plan" : isAuthenticated ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>

        {!isAuthenticated ? (
          <section className="mt-8 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-soft">
            <h3 className="font-display text-2xl text-ink">Sign in to activate a plan</h3>
            <p className="mt-2 text-sm text-slate-600">
              Authentication is required before subscription updates can be applied to your account.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/login?next=%2Fpricing"
                className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-slate-900"
              >
                Login
              </Link>
              <Link
                href="/signup?next=%2Fpricing"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:bg-slate-50"
              >
                Create account
              </Link>
            </div>
          </section>
        ) : null}
      </Container>
    </main>
  );
}
