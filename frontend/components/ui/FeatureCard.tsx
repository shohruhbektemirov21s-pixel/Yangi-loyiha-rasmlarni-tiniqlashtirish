import { FeatureItem } from "@/data/features";

const iconStyles =
  "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-blue-600 shadow-sm";

function FeatureIcon({ icon }: { icon: FeatureItem["icon"] }) {
  if (icon === "spark") {
    return (
      <div className={iconStyles} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3z" />
        </svg>
      </div>
    );
  }

  if (icon === "text") {
    return (
      <div className={iconStyles} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5h16" />
          <path d="M7 5v14" />
          <path d="M4 12h10" />
          <path d="M15 16h5" />
        </svg>
      </div>
    );
  }

  return (
    <div className={iconStyles} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h6M8 17h4" />
      </svg>
    </div>
  );
}

type FeatureCardProps = {
  item: FeatureItem;
};

export function FeatureCard({ item }: FeatureCardProps) {
  return (
    <article className="rounded-3xl border border-white/70 bg-white/80 p-6 backdrop-blur-sm shadow-sm hover:shadow-md transition duration-300 hover:-translate-y-1">
      <FeatureIcon icon={item.icon} />
      <h3 className="mt-5 text-xl font-semibold text-slate-800">{item.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
    </article>
  );
}
