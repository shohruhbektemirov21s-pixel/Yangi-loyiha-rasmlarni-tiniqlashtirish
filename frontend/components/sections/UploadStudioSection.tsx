"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { useImageJobUpload } from "@/hooks/useImageJobUpload";
import { useImageUpload } from "@/hooks/useImageUpload";
import { formatBytes, formatFileType } from "@/lib/format";

import { PreviewPlaceholder } from "./PreviewPlaceholder";

function readMaxUploadMb() {
  const raw = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 20;
  }

  return raw;
}

const MAX_UPLOAD_MB = readMaxUploadMb();

import { useTranslation } from "@/hooks/useTranslation";

export function UploadStudioSection() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const {
    file,
    previewUrl,
    error: uploadValidationError,
    isDragging,
    onInputChange,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    clear
  } = useImageUpload({ maxFileSizeMb: MAX_UPLOAD_MB });

  const { isUploading, error: uploadRequestError, startUpload, reset } = useImageJobUpload();

  const { success, error: errorToast } = useToast();

  const activeError = uploadValidationError || uploadRequestError;

  const fileMeta = useMemo(() => {
    if (!file) {
      return null;
    }

    return {
      name: file.name,
      size: formatBytes(file.size),
      type: formatFileType(file.type)
    };
  }, [file]);

  const handleClear = () => {
    clear();
    reset();
  };

  const handleProcessImage = async () => {
    if (!file) {
      errorToast("No image selected", "Please choose an image file before starting enhancement.");
      return;
    }

    try {
      if (!isAuthenticated || !token) {
        errorToast("Login required", "Please log in to process and save images.");
        router.push("/login?next=%2F");
        return;
      }

      const job = await startUpload(file, token);
      const usageMessage =
        job.usage && Number.isFinite(job.usage.uploadsRemaining)
          ? `Upload accepted. ${job.usage.uploadsRemaining} uploads remaining today.`
          : "Opening the result page.";
      success("Upload successful", usageMessage);
      router.push(`/result/${job.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      if (message === "The upload was canceled.") {
        return;
      }

      errorToast("Upload failed", message);
    }
  };

  return (
    <section id="upload-studio" className="pt-14 pb-20 sm:pt-20 sm:pb-24">
      <Container>
        <SectionHeading
          eyebrow="Upload & Optimize"
          title={t.uploadTitle}
          description={t.uploadDesc}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="rounded-[1.7rem] border border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur">
            <UploadDropzone
              isDragging={isDragging}
              disabled={isUploading}
              isProcessing={isUploading}
              onInputChange={onInputChange}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              {fileMeta ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Selected file</p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="max-w-[260px] truncate text-sm font-semibold text-ink">{fileMeta.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>Size: {fileMeta.size}</span>
                      <span>Type: {fileMeta.type}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No image selected yet.</p>
              )}

              {activeError ? <p className="mt-3 text-sm font-medium text-red-600">{activeError}</p> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={handleProcessImage} disabled={!file || isUploading} className="min-w-[220px]">
                  {isUploading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Uploading...
                    </span>
                  ) : (
                    "Upload & Open Results"
                  )}
                </Button>
                <Button variant="ghost" onClick={handleClear} disabled={isUploading || !file} className="px-4">
                  Remove file
                </Button>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Max file size: {MAX_UPLOAD_MB}MB. Enhancement and OCR are best-effort and depend on source quality.
              </p>
              {!isAuthenticated ? (
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Sign in to upload images and save processing history to your dashboard.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur">
            <h3 className="mb-4 text-lg font-semibold text-ink">Preview</h3>
            <PreviewPlaceholder originalPreviewUrl={previewUrl} />
            <p className="mt-4 text-sm leading-6 text-slate-500">
              The result page will show original and enhanced images, extracted text, copy/download actions, and
              status updates while processing completes.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
