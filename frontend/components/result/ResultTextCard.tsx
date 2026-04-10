import { Button } from "@/components/ui/Button";

type ResultTextCardProps = {
  text: string;
  isLoading?: boolean;
  onCopy: () => void;
  canCopy: boolean;
};

export function ResultTextCard({ text, isLoading = false, onCopy, canCopy }: ResultTextCardProps) {
  const normalizedText = text.trim();

  return (
    <section className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Extracted Text</h3>
        <Button variant="ghost" onClick={onCopy} disabled={!canCopy || isLoading} className="px-4 py-2 text-xs">
          Copy text
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-slate-100" />
          </div>
        ) : normalizedText ? (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">{text}</pre>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            No text was detected in this image. You can try another image or adjust the source quality.
          </p>
        )}
      </div>
    </section>
  );
}
