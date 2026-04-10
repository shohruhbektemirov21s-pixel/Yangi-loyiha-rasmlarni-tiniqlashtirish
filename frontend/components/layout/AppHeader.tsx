"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";

import { Container } from "./Container";

import { useTranslation } from "@/hooks/useTranslation";

export function AppHeader() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { success, error } = useToast();
  const { lang, changeLang, t } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = lang === "uz" ? "uz" : lang === "ru" ? "ru" : "en";
  }, [lang]);

  const handleLogout = async () => {
    try {
      await logout();
      success("Logged out", "Siz tizimdan chiqdingiz.");
      router.push("/login");
    } catch {
      error("Logout failed", "Xatolik.");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/70 backdrop-blur-md text-slate-900">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-xl text-slate-900 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          ImageClear AI
        </Link>
        

        <nav className="flex items-center gap-2">
          <div className="mr-4 flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
             <button onClick={() => changeLang('uz')} className={`px-2 py-1 rounded transition ${lang==='uz' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900'}`}>UZ</button>
             <button onClick={() => changeLang('ru')} className={`px-2 py-1 rounded transition ${lang==='ru' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900'}`}>RU</button>
             <button onClick={() => changeLang('en')} className={`px-2 py-1 rounded transition ${lang==='en' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900'}`}>EN</button>
          </div>
          
          <Link href="/" className="inline-flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 mx-1 transition">
            {t.navHome}
          </Link>
          <Link href="/compress" className="inline-flex items-center justify-center rounded-full bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700 border border-indigo-100 mx-1 transition">
            {t.compress}
          </Link>
          <Link href="/video-enhance" className="inline-flex items-center justify-center rounded-full bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 text-sm font-semibold text-cyan-700 border border-cyan-100 mx-1 transition">
            {t.enhanceVideo}
          </Link>

          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">{user?.email}</span>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Kabinet
              </Link>
              <Button variant="ghost" onClick={() => void handleLogout()} className="px-4 py-2 text-rose-600 hover:bg-rose-50 transition">
                Chiqish
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 border border-slate-800 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 hover:-translate-y-0.5"
              >
                {t.login}
              </Link>
            </>
          )}
        </nav>
      </Container>
    </header>
  );
}
