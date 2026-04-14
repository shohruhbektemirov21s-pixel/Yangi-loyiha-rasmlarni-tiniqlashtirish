"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import {
  bearerAuthHeaders,
  buildLargeUploadApiUrl,
  extractApiErrorMessage,
  pollCompressJobUntilDone,
  resolveBackendPublicUrl,
  xhrPostFormDataWithProgress
} from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { RevealOnScroll } from "@/components/animations/RevealOnScroll";

type CompressApiData = {
  compressed_url: string;
  original_size: number;
  compressed_size: number;
  compression_skipped?: boolean;
};

function isCompressVideoFile(f: File): boolean {
  const mime = f.type.toLowerCase();
  if (mime.startsWith("video/")) return true;
  const ext = f.name.split(".").pop()?.toLowerCase() || "";
  return ["mp4", "mov", "avi", "mkv", "webm", "m4v", "mpeg", "mpg", "wmv", "flv"].includes(ext);
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Taxminiy kodlash vaqti (video MB / daqiqa). */
function estimateEncodeMinutes(file: File, isVideo: boolean): number {
  if (!isVideo) return 1;
  const mb = file.size / (1024 * 1024);
  return Math.max(1, Math.min(120, Math.round(mb / 8 + 1)));
}

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<CompressApiData | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [postUploadPhase, setPostUploadPhase] = useState<"idle" | "encoding">("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [overallPct, setOverallPct] = useState<number | null>(null);

  const jobAbortRef = useRef<AbortController | null>(null);
  const jobStartedAtRef = useRef(0);
  const encodingStartedAtRef = useRef<number | null>(null);
  const isVideoJobRef = useRef(false);

  const { t } = useTranslation();
  const { token, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    return () => {
      jobAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isCompressing) {
      setElapsedSec(0);
      setOverallPct(null);
      return;
    }
    const tick = () => {
      const now = Date.now();
      setElapsedSec(Math.floor((now - jobStartedAtRef.current) / 1000));

      let pct: number | null = null;
      if (uploadPercent != null) {
        pct = isVideoJobRef.current
          ? Math.round(uploadPercent * 0.5)
          : Math.round(uploadPercent * 0.88);
      } else if (postUploadPhase === "encoding" && encodingStartedAtRef.current != null) {
        const encSec = Math.floor((now - encodingStartedAtRef.current) / 1000);
        pct = 50 + Math.min(48, Math.floor(encSec * 0.65));
      } else if (isCompressing && uploadPercent === null && postUploadPhase === "idle") {
        pct = isVideoJobRef.current ? 52 : 90;
      }
      if (pct != null) setOverallPct(Math.min(99, pct));
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [isCompressing, uploadPercent, postUploadPhase]);

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

  const alertFromPollError = (code: string, message?: string) => {
    if (code === "AUTH_401") {
      window.location.assign(`/login?next=${encodeURIComponent(pathname || "/compress")}`);
      return;
    }
    if (code === "CANCELLED" || code === "ABORTED") return;
    if (code === "POLL_TIMEOUT") {
      alert(t.compPollTimeout);
      return;
    }
    if (code === "NETWORK") {
      alert(t.compErrNetwork);
      return;
    }
    if (code === "TIMEOUT") {
      alert(t.compPollTimeout);
      return;
    }
    alert(message?.trim() || t.compErrServer);
  };

  const handleCompress = async () => {
    if (!file) return;
    if (!token?.trim()) {
      window.location.assign(`/login?next=${encodeURIComponent(pathname || "/compress")}`);
      return;
    }

    setIsCompressing(true);
    setResult(null);
    setUploadPercent(null);
    setPostUploadPhase("idle");
    setOverallPct(0);
    jobAbortRef.current?.abort();
    const jobAc = new AbortController();
    jobAbortRef.current = jobAc;
    const jobSignal = jobAc.signal;
    jobStartedAtRef.current = Date.now();
    encodingStartedAtRef.current = null;

    const formData = new FormData();
    formData.append("file", file);
    const headers = bearerAuthHeaders(token);
    const url = buildLargeUploadApiUrl("/compress");
    const video = isCompressVideoFile(file);
    isVideoJobRef.current = video;

    try {
      let status: number;
      let resData: unknown;

      setUploadPercent(0);
      try {
        const xhrRes = await xhrPostFormDataWithProgress(
          url,
          formData,
          headers,
          (pct) => {
            if (pct != null) setUploadPercent(pct);
          },
          { signal: jobSignal }
        );
        status = xhrRes.status;
        resData = xhrRes.body;
      } finally {
        setUploadPercent(null);
      }

      if (status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent(pathname || "/compress")}`);
        return;
      }

      if (status === 202) {
        const resObj = resData && typeof resData === "object" ? (resData as Record<string, unknown>) : null;
        const data = resObj?.data && typeof resObj.data === "object" ? (resObj.data as Record<string, unknown>) : null;
        const jobId = data && typeof data.job_id === "string" ? data.job_id : null;
        if (!jobId) {
          alert(extractApiErrorMessage(resData) || t.compErrServer);
          return;
        }
        setPostUploadPhase("encoding");
        encodingStartedAtRef.current = Date.now();
        try {
          const row = await pollCompressJobUntilDone(jobId, token, {
            isCancelled: () => jobSignal.aborted,
            signal: jobSignal
          });
          setOverallPct(100);
          setResult({
            compressed_url: String(row.compressed_url || ""),
            original_size: Number(row.original_size || 0),
            compressed_size: Number(row.compressed_size || 0),
            compression_skipped: Boolean(row.compression_skipped)
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === "AUTH_401") {
            window.location.assign(`/login?next=${encodeURIComponent(pathname || "/compress")}`);
            return;
          }
          if (msg === "CANCELLED" || msg === "ABORTED") return;
          if (msg === "POLL_TIMEOUT") {
            alert(t.compPollTimeout);
            return;
          }
          alert(msg.trim() || t.compErrServer);
        } finally {
          setPostUploadPhase("idle");
        }
        return;
      }

      if (!status || status >= 400) {
        alert(extractApiErrorMessage(resData) || t.compErrServer);
        return;
      }

      const resObj = resData && typeof resData === "object" ? (resData as Record<string, unknown>) : null;
      if (resObj?.success && resObj.data && typeof resObj.data === "object") {
        setOverallPct(100);
        const row = resObj.data as Record<string, unknown>;
        setResult({
          compressed_url: String(row.compressed_url || ""),
          original_size: Number(row.original_size || 0),
          compressed_size: Number(row.compressed_size || 0),
          compression_skipped: Boolean(row.compression_skipped)
        });
      } else {
        alert(t.compErrServer);
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "";
      if (msg === "ABORTED" || msg === "CANCELLED") {
        return;
      }
      if (msg === "NETWORK" || msg === "TIMEOUT") {
        alertFromPollError(msg);
      } else {
        alert(t.compErrNetwork);
      }
    } finally {
      setIsCompressing(false);
      setUploadPercent(null);
      setPostUploadPhase("idle");
      encodingStartedAtRef.current = null;
      jobAbortRef.current = null;
    }
  };

  const handleCancelCompress = () => {
    jobAbortRef.current?.abort();
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const pctLabel =
    uploadPercent != null ? t.compUploadPct.replace("{n}", String(uploadPercent)) : null;
  const etaMin = file ? estimateEncodeMinutes(file, isCompressVideoFile(file)) : 1;
  const canUseCompress = Boolean(token?.trim()) && !isLoading;

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <main className="flex-1">
        <Container>
          <RevealOnScroll delay={100} className="max-w-3xl mx-auto py-12 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              {t.compTitle}
            </h1>
            <p className="text-slate-600 text-lg mb-4">{t.compDesc}</p>
            <p className="text-slate-600 text-sm mb-2 font-medium text-indigo-700">{t.compMaxUpload}</p>
            <p className="text-slate-600 text-base mb-10 max-w-2xl mx-auto">{t.compOfficeFormats}</p>

            {!isLoading && isAuthenticated && !token?.trim() && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                <p className="mb-2">{t.compNeedToken}</p>
                <Link
                  href={`/login?next=${encodeURIComponent(pathname || "/compress")}`}
                  className="font-semibold text-indigo-700 underline"
                >
                  {t.compReLogin}
                </Link>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
              <input
                id="compress-file-input"
                type="file"
                accept="video/*,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.odt,.ods,.odp,application/*"
                onChange={handleFileChange}
                className="sr-only"
                disabled={!canUseCompress}
              />
              <label
                htmlFor="compress-file-input"
                className={`mb-6 inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-500/10 px-6 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-500/20 ${!canUseCompress ? "pointer-events-none opacity-50" : ""}`}
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
                    disabled={isCompressing || !canUseCompress}
                    className="bg-indigo-600 hover:bg-indigo-500 ml-4 py-2 px-6 rounded-lg text-white font-bold transition shadow-sm hover:-translate-y-0.5"
                  >
                    {isCompressing ? t.compWait : t.compStart}
                  </Button>
                </div>
              )}

              {isCompressing && (
                <div className="mb-6 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-indigo-950">
                    <span className="font-medium">{t.compElapsed.replace("{t}", formatMmSs(elapsedSec))}</span>
                    {overallPct != null && (
                      <span className="font-semibold">{t.compOverallPct.replace("{n}", String(overallPct))}</span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-800/90">{t.compEtaHint.replace("{n}", String(etaMin))}</p>
                  {uploadPercent != null && (
                    <>
                      <p className="text-sm font-medium text-indigo-900">
                        {t.compPhaseUploadShort} — {pctLabel}
                      </p>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-[width] duration-300"
                          style={{ width: `${uploadPercent}%` }}
                        />
                      </div>
                    </>
                  )}
                  {postUploadPhase === "encoding" && (
                    <p className="text-sm font-medium text-indigo-900">{t.compPhaseEncodeShort}: {t.compEncoding}</p>
                  )}
                  {overallPct != null && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCancelCompress}
                    className="w-full rounded-lg border border-indigo-200 bg-white py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-50"
                  >
                    {t.actionCancel}
                  </button>
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

                  {result.compression_skipped && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
                      <p className="font-semibold mb-1">{t.compPrecompressedTitle}</p>
                      <p className="leading-relaxed text-amber-900/95">{t.compPrecompressedBody}</p>
                    </div>
                  )}

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
                  <Link
                    href="/"
                    className="mt-3 block w-full text-center text-sm font-semibold text-indigo-700 underline underline-offset-2"
                  >
                    {t.afterDoneGoHome}
                  </Link>
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
