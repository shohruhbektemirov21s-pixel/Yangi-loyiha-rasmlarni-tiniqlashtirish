"use client";

import { Container } from "@/components/layout/Container";
import { useTranslation } from "@/hooks/useTranslation";

export function AboutSection() {
  const { t } = useTranslation();

  return (
    <section className="py-14 sm:py-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100 rounded-full blur-3xl"></div>
      
      <Container className="relative z-10">
        <div className="text-center mb-16">
          <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm border border-indigo-200 px-4 py-1.5 rounded-full bg-indigo-50 shadow-sm">ImageClear AI</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-6 mb-6 text-slate-900 leading-tight">
            {t.aboutTitle || "Loyihamiz haqida"}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t.aboutDesc || "ImageClear AI - bu sun'iy intellekt orqali raqamli fayllaringiz sifatini eng yuqori darajagacha ko'tarishga va hajmini kichraytirishga yordam beruvchi universal vosita."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-16">
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-lg hover:shadow-xl transition duration-300 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition"></div>
            <div className="w-14 h-14 bg-blue-50 text-blue-600 flex items-center justify-center rounded-2xl mb-6 text-2xl relative z-10 shadow-sm border border-blue-100">🪄</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 relative z-10">{t.aboutImgVid || "Rasm va Videolarni tiniqlash"}</h3>
            <p className="text-slate-600 leading-relaxed relative z-10">
              {t.aboutImgVidDesc || "Eski, past sifatli yoki fokusdan qochgan kadrlar endi yo'qotilgan tafsilotlari bilan qayta tiklanadi. Bizning algoritm piksellarni hisoblab ularni tekislaydi."}
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-lg hover:shadow-xl transition duration-300 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition"></div>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-2xl mb-6 text-2xl relative z-10 shadow-sm border border-emerald-100">📦</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 relative z-10">{t.aboutZip || "Fayllarni siqish (Kompressiya)"}</h3>
            <p className="text-slate-600 leading-relaxed relative z-10">
              {t.aboutZipDesc || "Katta hajmli fayllarni (ayniqsa video va rasmlarni) ko'z bilan ilg'ab bo'lmaydigan darajada sifatini asragan holda 5-10 barobargacha kichraytiradi."}
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto rounded-3xl bg-white border border-slate-200 p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-xl group">
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition duration-500"></div>
          
          <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-4">Dasturchi Kontaktlari</p>
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 w-full justify-center">
            
            <a href="https://t.me/shohruhbek_2102" target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-white transition shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl shadow-inner">
                ✈️
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500 font-semibold uppercase">Telegram</p>
                <p className="text-slate-800 font-bold text-lg">@shohruhbek_2102</p>
              </div>
            </a>

            <a href="tel:+998501093514" className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-white transition shadow-sm">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xl shadow-inner">
                📞
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500 font-semibold uppercase">Telefon raqam</p>
                <p className="text-slate-800 font-bold text-lg" style={{ letterSpacing: "0.5px" }}>+998 (50) 109 35 14</p>
              </div>
            </a>

          </div>
        </div>
      </Container>
    </section>
  );
}
