"use client";

import { Container } from "@/components/layout/Container";
import Link from "next/link";

export function CompressPromoSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[120px] -mr-48 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-100/30 rounded-full blur-[100px] -ml-24 -mb-24"></div>
      </div>

      <Container className="relative z-10">
        <div className="bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-100 rounded-[3rem] p-8 md:p-16 shadow-2xl shadow-emerald-200/20 relative overflow-hidden group">
          {/* Internal Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl group-hover:bg-emerald-400/10 transition duration-700"></div>
          
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold uppercase tracking-widest mb-8 border border-emerald-200 animate-pulse">
              <span>🚀</span> Tez va Sifatli
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-8 leading-[1.1]">
              Fayllarni Siqish <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                {"Mo'jizasini sinab ko'ring!"}
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed font-medium">
                Telefoningizda joy qolmadimi? <br className="hidden md:block" /> 
                Biz bilan 1GB videoni 100MB gacha,{" "}
                <span className="text-emerald-600 font-bold underline decoration-emerald-200 underline-offset-4">
                  {"sifatini 1% ham yo'qotmasdan"}
                </span>{" "}
                kichraytiring!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link 
                href="/compress" 
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white text-xl font-bold rounded-2xl shadow-xl shadow-emerald-500/30 transition transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
              >
                <span>📦</span> Hozir boshlash
              </Link>
              
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center -space-x-3 mb-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {/* Generator placeholder icons */}
                            👤
                        </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                        +2k
                    </div>
                </div>
                <p className="text-sm text-slate-500 font-medium">2000+ foydalanuvchi bu haftada siqish xizmatidan foydalandi</p>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 border-t border-emerald-100/50">
                {[
                    { label: "Sifat yo\u2019qolmaydi", icon: "💎" },
                    { label: "10x gacha siqish", icon: "⚖️" },
                    { label: "Barcha formatlar", icon: "📂" },
                    { label: "Xavfsiz saqlash", icon: "🔒" }
                ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
