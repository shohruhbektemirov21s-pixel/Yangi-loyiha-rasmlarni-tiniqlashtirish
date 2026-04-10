import { cn } from "@/lib/cn";

type PlanBadgeProps = {
  planCode: string | null | undefined;
  size?: "sm" | "md";
};

export function PlanBadge({ planCode, size = "sm" }: PlanBadgeProps) {
  const normalized = (planCode || "free").trim().toLowerCase();
  const isPremium = normalized === "premium";
  const label = isPremium ? "Premium" : "Free";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-[0.11em]",
        size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]",
        isPremium
          ? "border border-amber-200 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900"
          : "border border-brand-200 bg-brand-100 text-brand-700"
      )}
    >
      {label}
    </span>
  );
}
