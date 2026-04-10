"use client";

import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { useTranslation } from "@/hooks/useTranslation";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden pt-12 sm:pt-16">
      <Container>
        <div className="relative rounded-[2rem] border border-white/80 bg-white/75 p-8 shadow-sm backdrop-blur-md md:p-12">
          <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
          <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-accent-200/45 blur-3xl" aria-hidden />

          <div className="relative max-w-3xl">
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              ImageClear AI Workspace
            </p>
            <h1 className="mt-5 font-display text-4xl leading-tight text-slate-900 sm:text-5xl md:text-6xl">
              {t.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {t.heroDesc}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#upload-studio"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                {t.uploadBtn}
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full bg-white border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              >
                {t.exploreBtn}
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-white border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              >
                {t.viewHistoryBtn}
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
