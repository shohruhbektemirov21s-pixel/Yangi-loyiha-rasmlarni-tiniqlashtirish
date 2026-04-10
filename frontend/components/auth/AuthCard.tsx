import Link from "next/link";

import { cn } from "@/lib/cn";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  className?: string;
};

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  className,
}: AuthCardProps) {
  return (
    <div className={cn("w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-6 shadow-soft sm:p-8", className)}>
      <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
        ImageClear AI
      </p>
      <h1 className="mt-4 font-display text-3xl text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>

      <div className="mt-6">{children}</div>

      <p className="mt-6 text-sm text-slate-600">
        {footerText}{" "}
        <Link href={footerLinkHref} className="font-semibold text-brand-700 hover:text-brand-600">
          {footerLinkLabel}
        </Link>
      </p>
    </div>
  );
}
