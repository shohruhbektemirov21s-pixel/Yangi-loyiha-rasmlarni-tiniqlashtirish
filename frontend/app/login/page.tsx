"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

function LoginPageInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { success, error: errorToast } = useToast();

  const nextPath = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, isLoading, nextPath, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const normEmail = email.trim().toLowerCase();
    if (!normEmail || !normEmail.includes("@")) {
      setFormError("Iltimos to'g'ri email kiriting.");
      return;
    }
    if (!password) {
      setFormError("Parol kiritilishi shart.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: normEmail, password });
      success("Xush kelibsiz", "Muvaffaqiyatli kirdingiz.");
      router.replace(nextPath);
    } catch (authError) {
      let message = authError instanceof Error ? authError.message : "Tizimga kirishda xatolik.";
      if (message.includes("Invalid email or password")) {
        message = "Pochta yoki parol xato kiritildi. Iltimos qayta urinib ko'ring.";
      }
      setFormError(message);
      errorToast("Xatolik", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-14 text-white relative">
      <div className="absolute top-6 left-6 flex space-x-4">
        <Link href="/" className="text-slate-400 hover:text-white transition flex items-center bg-slate-800/50 px-4 py-2 rounded-full text-sm">
          ← {t.navHome}
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2">{t.logTitle}</h1>
          <p className="text-slate-400 text-sm">{t.logSub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="text-sm font-semibold text-slate-300 drop-shadow">{t.emailLbl}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition shadow-inner"
              placeholder="siz@pochta.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300 drop-shadow">{t.passLbl}</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-3 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner"
                placeholder="Parolingizni yozing"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>
          </div>

          {formError && <p className="text-sm font-medium text-red-500 text-center animate-pulse">{formError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-cyan-600 py-3 rounded-xl transition duration-300 font-bold shadow-lg shadow-indigo-500/20">
            {isSubmitting ? t.waitMsg : t.logBtn}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400 relative z-10">
          {t.noAcc}{" "}
          <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2">
            {t.goReg}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
          <p className="text-slate-400 text-sm">Yuklanmoqda...</p>
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
