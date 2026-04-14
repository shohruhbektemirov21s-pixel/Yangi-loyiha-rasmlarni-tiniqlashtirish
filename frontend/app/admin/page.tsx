"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { buildApiUrl, parseJsonSafely } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";

type AdminStats = {
  total_users: number;
  total_jobs: number;
  active_now: number;
  recent_users: { id: string; email: string }[];
};

export default function AdminPanel() {
  const { isAuthenticated, isLoading, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setStats(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadError(null);
      try {
        const res = await fetch(buildApiUrl("/admin/stats"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = (await parseJsonSafely(res)) as { success?: boolean; data?: unknown; message?: string } | null;
        if (cancelled) return;
        if (res.status === 403) {
          setLoadError(
            data?.message ||
              "Admin huquqi yo'q. Backend .env da ADMIN_EMAILS ro'yxatiga o'z emailingizni qo'shing."
          );
          setStats(null);
          return;
        }
        if (!res.ok) {
          setLoadError(data?.message || `HTTP ${res.status}`);
          setStats(null);
          return;
        }
        if (!data?.success || !data.data) {
          setLoadError("Javob noto'g'ri formatda.");
          setStats(null);
          return;
        }
        setStats(data.data as AdminStats);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Tarmoq xatosi");
          setStats(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Yuklanmoqda...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <Link href="/" className="absolute top-8 left-8 text-slate-400 hover:text-white transition">
          ← Bosh sahifa
        </Link>
        <p className="text-slate-300 mb-6 text-center max-w-md">
          Admin panel uchun avval tizimga kiring. Keyin server ADMIN_EMAILS ro&apos;yxatida bo&apos;lgan akkaunt
          kerak.
        </p>
        <Link
          href="/login?next=/admin"
          className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-500"
        >
          Kirish
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pt-20">
      <main className="flex-1 pb-20">
        <Container>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-bold mb-2">Boshqaruv paneli (Admin)</h1>
              <p className="text-slate-400">Umumiy tizim holati (faqat ruxsat berilgan akkauntlar)</p>
            </div>
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
              Kabinet
            </Link>
          </div>

          {loadError && (
            <div className="mb-8 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100">
              {loadError}
            </div>
          )}

          {!loadError && !stats ? (
            <p className="text-center text-slate-400 mt-10">Ma&apos;lumotlar yuklanmoqda...</p>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                  <p className="text-slate-400 text-sm font-semibold mb-2">Jami foydalanuvchilar</p>
                  <h2 className="text-4xl font-bold text-blue-400">{stats.total_users}</h2>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
                  <p className="text-slate-400 text-sm font-semibold mb-2">Taxminiy aktiv (demo)</p>
                  <h2 className="text-4xl font-bold text-green-400">{stats.active_now}</h2>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                  <p className="text-slate-400 text-sm font-semibold mb-2">Jami operatsiyalar (jobs)</p>
                  <h2 className="text-4xl font-bold text-purple-400">{stats.total_jobs}</h2>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-6 border-b border-slate-800 pb-4">So&apos;nggi foydalanuvchilar</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-800/50 text-slate-300">
                    <tr>
                      <th className="px-6 py-4 font-medium">ID</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stats.recent_users.map((u, index) => (
                      <tr key={`${u.id}-${index}`} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4">#{u.id}</td>
                        <td className="px-6 py-4 text-white font-medium">{u.email}</td>
                      </tr>
                    ))}
                    {stats.recent_users.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-center">
                          Ma&apos;lumot yo&apos;q
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </Container>
      </main>
    </div>
  );
}
