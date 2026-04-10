"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { buildApiUrl, parseJsonSafely } from "@/lib/api/client";

type AdminStats = {
  total_users: number;
  total_jobs: number;
  active_now: number;
  recent_users: { id: string; email: string }[];
};

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(buildApiUrl("/admin/stats"));
        const data = (await parseJsonSafely(res)) as { success?: boolean; data?: unknown } | null;
        if (cancelled || !data?.success || !data.data) {
          return;
        }
        setStats(data.data as AdminStats);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      setIsAdmin(true);
    } else {
      alert("Parol noto'g'ri / Incorrect password");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Link href="/" className="absolute top-8 left-8 text-slate-400 hover:text-white transition">← Bosh sahifaga qaytish</Link>
        <div className="bg-slate-900 border border-slate-800 p-10 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
            🔐
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Admin Panel
          </h1>
          <p className="text-slate-400 mb-8">Tizimga kirish uchun maxfiy parolni kiriting</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Admin parol (admin123)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white mb-6 focus:border-indigo-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg text-white font-bold transition">
              Kirish
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pt-20">
      <main className="flex-1 pb-20">
        <Container>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-bold mb-2">Boshqaruv Paneli (Admin)</h1>
              <p className="text-slate-400">Umumiy tizim holati va foydalanuvchilar faolligi</p>
            </div>
            <Button onClick={() => setIsAdmin(false)} className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
              Chiqish
            </Button>
          </div>

          {!stats ? (
            <p className="text-center text-slate-400 mt-10">
              {"Real-time ma'lumotlar yuklanmoqda..."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                  <p className="text-slate-400 text-sm font-semibold mb-2">Jami Foydalanuvchilar</p>
                  <h2 className="text-4xl font-bold text-blue-400">{stats.total_users}</h2>
                  <p className="text-green-400 text-xs mt-3 flex items-center">↑ 100% Real-time rostat</p>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
                  <p className="text-slate-400 text-sm font-semibold mb-2">Ayni damda aktiv (Live API)</p>
                  <h2 className="text-4xl font-bold text-green-400">{stats.active_now}</h2>
                  <p className="text-slate-500 text-xs mt-3 flex items-center">Hozir tizimdan faol holatda</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                  <p className="text-slate-400 text-sm font-semibold mb-2">Barcha Operatsiyalar (Jobs)</p>
                  <h2 className="text-4xl font-bold text-purple-400">{stats.total_jobs}</h2>
                  <p className="text-blue-400 text-xs mt-3 flex items-center">Bajarilgan jami siqish va tiniqlashlar</p>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-6 border-b border-slate-800 pb-4">
                {"Eng so'nggi ro'yxatdan o'tganlar (Live Feed)"}
              </h3>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-800/50 text-slate-300">
                      <tr>
                        <th className="px-6 py-4 font-medium">Ulanish ID</th>
                        <th className="px-6 py-4 font-medium">Foydalanuvchi Elektron Pochtasi</th>
                        <th className="px-6 py-4 font-medium">Holati</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {stats.recent_users.map((user, index) => (
                        <tr key={`${user.id}-${index}`} className="hover:bg-slate-800/30 transition">
                          <td className="px-6 py-4">#{user.id}</td>
                          <td className="px-6 py-4 text-white font-medium">{user.email}</td>
                          <td className="px-6 py-4"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs animate-pulse">Online tasdiqlangan</span></td>
                        </tr>
                      ))}
                      {stats.recent_users.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center">
                            {"Hozircha bazada hamma narsa bo'sh"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
              </div>
            </>
          )}
        </Container>
      </main>
    </div>
  );
}
