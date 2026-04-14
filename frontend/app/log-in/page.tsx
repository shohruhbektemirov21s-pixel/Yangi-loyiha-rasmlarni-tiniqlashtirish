"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Ba'zi havolalar `/log-in` ishlatadi; ixtiyoriy query (`from`, `next`, …) bilan `/login` ga o'tkazamiz.
 */
function LogInRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(q ? `/login?${q}` : "/login");
  }, [router, searchParams]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-300"
      style={{ backgroundColor: "#020617" }}
    >
      <p className="text-sm">Yo&apos;naltirilmoqda...</p>
    </main>
  );
}

export default function LogInAliasPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-300"
          style={{ backgroundColor: "#020617" }}
        >
          <p className="text-sm">Yuklanmoqda...</p>
        </main>
      }
    >
      <LogInRedirectInner />
    </Suspense>
  );
}
