"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import {
  bearerAuthHeaders,
  buildLargeUploadApiUrl,
  extractApiErrorMessage,
  parseJsonSafely,
  resolveBackendPublicUrl
} from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { RevealOnScroll } from "@/components/animations/RevealOnScroll";

type VideoEnhanceApiData = {
  enhanced_url: string;
};

type ImageEnhanceApiData = {
  enhanced_image_url: string;
  extracted_text: string;
};

type EnhanceResult =
  | { kind: "video"; data: VideoEnhanceApiData }
  | { kind: "image"; data: ImageEnhanceApiData };

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "heic",
  "heif",
  "tif",
  "tiff"
]);

const VIDEO_EXT = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v",
  "mpeg",
  "mpg",
  "wmv",
  "flv"
]);

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isEnhanceImageFile(f: File): boolean {
  const mime = f.type.toLowerCase();
  if (mime.startsWith("image/")) {
    if (mime.includes("svg")) return false;
    return true;
  }
  return IMAGE_EXT.has(fileExt(f.name));
}

function isEnhanceVideoFile(f: File): boolean {
  const mime = f.type.toLowerCase();
  if (mime.startsWith("video/")) return true;
  return VIDEO_EXT.has(fileExt(f.name));
}

export default function VideoEnhancePage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const pathname = usePathname();
  const [file, setFile] = useState<File | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [result, setResult] = useState<EnhanceResult | null>(null);

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

  const handleEnhance = async () => {
    if (!file) return;

    const image = isEnhanceImageFile(file);
    const video = isEnhanceVideoFile(file);
    if (!image && !video) {
      alert(t.vidUnsupportedType);
      return;
    }

    setIsEnhancing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const path = image ? "/image_enhance" : "/video_enhance";

    try {
      const response = await fetch(buildLargeUploadApiUrl(path), {
        method: "POST",
        headers: bearerAuthHeaders(token),
        body: formData
      });
      const resData = (await parseJsonSafely(response)) as Record<string, unknown> | string | null;
      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent(pathname || "/video-enhance")}`);
        return;
      }
      if (!response.ok) {
        alert(extractApiErrorMessage(resData) || t.vidErrServer);
        return;
      }
      if (resData && typeof resData === "object" && resData.success && resData.data) {
        const data = resData.data as Record<string, unknown>;
        if (image) {
          setResult({
            kind: "image",
            data: {
              enhanced_image_url: String(data.enhanced_image_url || ""),
              extracted_text: String(data.extracted_text || "")
            }
          });
        } else {
          setResult({
            kind: "video",
            data: { enhanced_url: String(data.enhanced_url || "") }
          });
        }
      } else {
        alert(t.vidErrServer);
      }
    } catch (err) {
      console.error(err);
      alert(t.vidErrNetwork);
    } finally {
      setIsEnhancing(false);
    }
  };

  const fileKindLabel =
    file && isEnhanceImageFile(file)
      ? t.vidImageSelected
      : file && isEnhanceVideoFile(file)
        ? t.vidVideoSelected
        : "";

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <main className="flex-1">
        <Container>
          <RevealOnScroll delay={100} className="max-w-3xl mx-auto py-12 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent mb-4">
              {t.vidTitle}
            </h1>
            <p className="text-slate-600 text-lg mb-6">{t.vidDesc}</p>

            <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 text-slate-700 text-sm leading-relaxed shadow-sm">
              <p className="font-semibold text-slate-800 mb-3">{t.vidInfoIntro}</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t.vidBulletVideo}</li>
                <li>{t.vidBulletImage}</li>
                <li>{t.vidBulletOcr}</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
              <input
                id="video-enhance-file-input"
                type="file"
                accept="video/*,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,.heic,.heif,.tif"
                onChange={handleFileChange}
                className="sr-only"
              />
              <label
                htmlFor="video-enhance-file-input"
                className="mb-6 inline-flex cursor-pointer items-center justify-center rounded-full bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-600 transition hover:bg-cyan-500/20"
              >
                {t.compPickFile}
              </label>

              {file && (
                <div className="text-left bg-slate-50 p-4 border border-slate-100 rounded-xl mb-6 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-800 truncate max-w-xs">{file.name}</p>
                    <p className="text-sm text-slate-500">{fileKindLabel}</p>
                  </div>
                  <Button
                    onClick={handleEnhance}
                    disabled={isEnhancing}
                    className="bg-cyan-600 hover:bg-cyan-500 ml-4 py-2 px-6 rounded-lg text-white font-bold transition shadow-sm hover:shadow-md"
                  >
                    {isEnhancing ? t.vidWait : t.vidStart}
                  </Button>
                </div>
              )}

              {result?.kind === "video" && (
                <div className="mt-8 pt-8 border-t border-slate-200 animate-fade-in text-center">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex justify-center items-center">
                    <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full mr-3 text-sm">✓</span>{" "}
                    {t.compDone}
                  </h3>
                  <button
                    onClick={() => {
                      const rawUrl = result.data.enhanced_url;
                      const absolute = resolveBackendPublicUrl(rawUrl);
                      if (!absolute) return;
                      const dot = rawUrl.lastIndexOf(".");
                      const ext = dot >= 0 ? rawUrl.substring(dot) : ".mp4";
                      forceDownload(absolute, `enhanced_video${ext}`);
                    }}
                    className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-8 rounded-xl transition shadow-md hover:-translate-y-0.5"
                  >
                    {t.dlBtn || "Tiniq videoni yuklab olish ⬇"}
                  </button>
                </div>
              )}

              {result?.kind === "image" && (
                <div className="mt-8 pt-8 border-t border-slate-200 animate-fade-in text-left space-y-6">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center justify-center">
                    <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full mr-3 text-sm">✓</span>{" "}
                    {t.compDone}
                  </h3>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const rawUrl = result.data.enhanced_image_url;
                        const absolute = resolveBackendPublicUrl(rawUrl);
                        if (!absolute) return;
                        const dot = rawUrl.lastIndexOf(".");
                        const ext = dot >= 0 ? rawUrl.substring(dot) : ".png";
                        forceDownload(absolute, `enhanced_image${ext}`);
                      }}
                      className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-8 rounded-xl transition shadow-md hover:-translate-y-0.5"
                    >
                      {t.vidDlImage}
                    </button>
                  </div>
                  {result.data.extracted_text.trim() ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">{t.vidOcrLabel}</p>
                      <pre className="whitespace-pre-wrap break-words text-left text-sm bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                        {result.data.extracted_text}
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <p className="text-slate-500 text-sm mt-8">{t.vidNote}</p>
          </RevealOnScroll>
        </Container>
      </main>
    </div>
  );
}
