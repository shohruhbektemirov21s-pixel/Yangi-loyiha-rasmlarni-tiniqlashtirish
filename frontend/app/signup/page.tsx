"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, isAuthenticated, isLoading } = useAuth();
  const { success, error: errorToast } = useToast();
  const { t } = useTranslation();

  const nextPath = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setFormError("Iltimos to'g'ri elektron pochta kiriting.");
      return;
    }
    if (password.length < 8) {
      setFormError("Parol kamida 8 harfdan iborat bo'lishi kerak.");
      errorToast("Xatolik", "Parol kamida 8 harfdan iborat bo'lishi kerak.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Ikki parol bir biriga mos tushmadi.");
      errorToast("Xatolik", "Parollar bir biriga mos tushmadi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({ email: normEmail, password, confirmPassword, fullName: fullName.trim() || undefined });
      success("Profil ochildi", "Tizimga xush kelibsiz.");
      router.replace(nextPath);
    } catch (authError) {
      let message = authError instanceof Error ? authError.message : "Ro'yxatdan o'tishda xatolik.";
      if (message.includes("already exists")) {
        message = "Bu elektron pochta xozirda tizimda mavjud. Iltimos boshqa pochta ishlating yoki avtorizatsiyadan o'ting.";
      } else if (message.includes("at least") || message.includes("weak")) {
        message = "Parol juda qisqa, kamida 8 ta harf yoki raqam qatnashishi shart.";
      } else if (message.includes("fetch")) {
        message = "Tarmoq xatosi, server bilan ulanib bo'lmadi.";
      } else {
        message = "Noto'g'ri ma'lumot yoki server tarmog'ida nosozlik: " + message;
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
        <Link href="/" className="text-slate-400 hover:text-cyan-400 transition flex items-center bg-slate-800/50 px-5 py-2 rounded-full text-sm font-semibold shadow-lg">
          ← {t.navHome}
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.05)] max-w-[28rem] w-full relative overflow-hidden">
        <div className="absolute -left-20 top-20 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -right-10 bottom-10 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">{t.regTitle}</h1>
          <p className="text-slate-400 text-sm leading-relaxed">{t.regSub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{t.nameLbl}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition shadow-inner"
              placeholder="Masalan: Sardor"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{t.emailLbl} *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner"
              placeholder="siz@pochta.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{t.passLbl} *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-3 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition shadow-inner"
                  placeholder="Kamida 8 narsa"
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
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{t.passRep}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-3 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner"
                  placeholder="Parolni takrorlang"
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
          </div>

          {formError && <p className="text-sm font-medium text-rose-500 text-center animate-pulse pt-2">{formError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 py-3.5 rounded-xl transition duration-300 font-bold shadow-lg shadow-cyan-500/20 mt-4">
            {isSubmitting ? t.waitMsg : t.regBtn}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400 relative z-10">
          {t.hasAcc}{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2">
            {t.goLog}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
          <p className="text-slate-400 text-sm">Yuklanmoqda...</p>
        </main>
      }
    >
      <SignupPageInner />
    </Suspense>
  );
}
