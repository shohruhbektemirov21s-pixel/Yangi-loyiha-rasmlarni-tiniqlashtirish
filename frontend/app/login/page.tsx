"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { finalizePostAuthRedirect, resolvePostAuthPath } from "@/lib/navigation/postAuthRedirect";

function LoginPageInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { success, error: errorToast } = useToast();
  const reduceMotion = useReducedMotion();

  const nextPath = useMemo(() => resolvePostAuthPath(searchParams), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      finalizePostAuthRedirect(nextPath);
    }
  }, [isAuthenticated, isLoading, nextPath]);

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
      finalizePostAuthRedirect(nextPath);
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

  const fade = reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };
  const rise = reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fade}
      className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 py-14 text-white"
      style={{ backgroundColor: "#020617" }}
    >
      <div className="absolute left-6 top-6 flex space-x-4">
        <Link href="/" className="text-slate-400 hover:text-white transition flex items-center bg-slate-800/50 px-4 py-2 rounded-full text-sm">
          ← {t.navHome}
        </Link>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={rise}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-10 shadow-2xl"
      >
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
          <Link
            href={`/signup?next=${encodeURIComponent(nextPath)}`}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
          >
            {t.goReg}
          </Link>
        </p>
      </motion.div>
    </motion.main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white"
          style={{ backgroundColor: "#020617" }}
        >
          <p className="text-sm text-slate-400">Yuklanmoqda...</p>
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
