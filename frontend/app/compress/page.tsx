"use client";

import React, { useState } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import {
  buildLargeUploadApiUrl,
  extractApiErrorMessage,
  parseJsonSafely,
  resolveBackendPublicUrl
} from "@/lib/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { RevealOnScroll } from "@/components/animations/RevealOnScroll";

type CompressApiData = {
  compressed_url: string;
  original_size: number;
  compressed_size: number;
};

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<CompressApiData | null>(null);

  const { t } = useTranslation();

  const forceDownload = async (url: string, defaultFilename: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsCompressing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(buildLargeUploadApiUrl("/compress"), {
        method: "POST",
        body: formData
      });
      const resData = (await parseJsonSafely(response)) as Record<string, unknown> | string | null;
      if (!response.ok) {
        alert(extractApiErrorMessage(resData) || t.compErrServer);
        return;
      }
      if (resData && typeof resData === "object" && resData.success && resData.data) {
        setResult(resData.data as CompressApiData);
      } else {
        alert(t.compErrServer);
      }
    } catch (err) {
      console.error(err);
      alert(t.compErrNetwork);
    } finally {
      setIsCompressing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <main className="flex-1">
        <Container>
          <RevealOnScroll delay={100} className="max-w-3xl mx-auto py-12 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              {t.compTitle}
            </h1>
            <p className="text-slate-600 text-lg mb-4">{t.compDesc}</p>
            <p className="text-slate-600 text-base mb-10 max-w-2xl mx-auto">{t.compOfficeFormats}</p>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
              <input
                id="compress-file-input"
                type="file"
                accept="video/*,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.odt,.ods,.odp,application/*"
                onChange={handleFileChange}
                className="sr-only"
              />
              <label
                htmlFor="compress-file-input"
                className="mb-6 inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-500/10 px-6 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-500/20"
              >
                {t.compPickFile}
              </label>

              {file && (
                <div className="text-left bg-slate-50 p-4 border border-slate-200 rounded-xl mb-6 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-800 truncate max-w-xs">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {t.compReady}: {formatSize(file.size)}
                    </p>
                  </div>
                  <Button
                    onClick={handleCompress}
                    disabled={isCompressing}
                    className="bg-indigo-600 hover:bg-indigo-500 ml-4 py-2 px-6 rounded-lg text-white font-bold transition shadow-sm hover:-translate-y-0.5"
                  >
                    {isCompressing ? t.compWait : t.compStart}
                  </Button>
                </div>
              )}

              {result && (
                <div className="mt-8 pt-8 border-t border-slate-200 animate-fade-in text-left">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="bg-emerald-100 text-emerald-600 p-2 rounded-full mr-3 text-sm">✓</span>{" "}
                    {t.compDone}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-slate-500 text-sm mb-1">{t.compOldSz}</p>
                      <p className="text-2xl font-bold text-slate-800">{formatSize(result.original_size)}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-indigo-200 rounded-full blur-xl"></div>
                      <p className="text-indigo-600 text-sm mb-1">{t.compNewSz}</p>
                      <p className="text-2xl font-bold text-indigo-900">{formatSize(result.compressed_size)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                        const rawUrl = result.compressed_url;
                        const absolute = resolveBackendPublicUrl(rawUrl);
                        if (!absolute) return;
                        const dot = rawUrl.lastIndexOf(".");
                        const ext = dot >= 0 ? rawUrl.substring(dot) : "";
                        forceDownload(absolute, `compressed_file${ext || ".bin"}`);
                    }}
                    className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition shadow-md hover:-translate-y-0.5"
                  >
                    {t.dlBtn || "Yuklab Olish ⬇"}
                  </button>
                </div>
              )}
            </div>
            
            <p className="text-slate-500 text-sm mt-8">{t.compFootNote}</p>
          </RevealOnScroll>
        </Container>
      </main>
    </div>
  );
}
