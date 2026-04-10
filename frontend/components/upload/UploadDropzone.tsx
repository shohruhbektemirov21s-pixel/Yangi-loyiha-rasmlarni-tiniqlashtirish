"use client";

import { ChangeEvent, DragEvent, useId } from "react";

import { cn } from "@/lib/cn";

type UploadDropzoneProps = {
  isDragging: boolean;
  disabled?: boolean;
  isProcessing?: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

import { useTranslation } from "@/hooks/useTranslation";

export function UploadDropzone({
  isDragging,
  disabled = false,
  isProcessing = false,
  onInputChange,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop
}: UploadDropzoneProps) {
  const inputId = useId();
  const { t } = useTranslation();

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onDragEnter(event);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onDragOver(event);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onDragLeave(event);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onDrop(event);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    onInputChange(event);
  };

  return (
    <label
      htmlFor={inputId}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed bg-gradient-to-b from-white to-slate-50 px-5 py-12 text-center transition-all",
        disabled && "cursor-not-allowed opacity-75",
        isDragging
          ? "border-brand-500 bg-brand-50/70 shadow-card"
          : "border-slate-300/90 shadow-soft hover:border-brand-300 hover:bg-white"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 16V8" />
          <path d="M8.5 11.5 12 8l3.5 3.5" />
          <path d="M7 19h10" />
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      </div>
      <p className="mt-4 text-base font-semibold text-ink">
        {isProcessing ? t.prcWait : t.dzDrag}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {isProcessing ? "..." : t.dzClick}
      </p>
      <span className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition group-hover:bg-slate-900">
        {isProcessing ? "Processing" : t.dzChoose}
      </span>

      <input
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </label>
  );
}
