"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useState } from "react";

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
] as const;

export const ACCEPTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

type UploadState = {
  file: File | null;
  previewUrl: string | null;
  error: string | null;
  isDragging: boolean;
};

type UseImageUploadOptions = {
  acceptedMimeTypes?: readonly string[];
  maxFileSizeMb?: number;
};

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const acceptedMimeTypes = options.acceptedMimeTypes ?? ACCEPTED_IMAGE_MIME_TYPES;
  const maxFileSizeMb = options.maxFileSizeMb ?? 20;
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  const [state, setState] = useState<UploadState>({
    file: null,
    previewUrl: null,
    error: null,
    isDragging: false
  });

  const setFile = useCallback((file: File | null) => {
    if (!file) {
      setState((prev) => {
        if (prev.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }

        return { ...prev, file: null, previewUrl: null, error: null };
      });
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mimeAllowed = acceptedMimeTypes.includes(file.type);
    const extensionAllowed = ACCEPTED_IMAGE_EXTENSIONS.includes(
      extension as (typeof ACCEPTED_IMAGE_EXTENSIONS)[number]
    );

    if (!mimeAllowed && !extensionAllowed) {
      setState((prev) => {
        if (prev.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }

        return {
          ...prev,
          error: "Please upload a JPG, PNG, or WEBP image.",
          file: null,
          previewUrl: null
        };
      });
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setState((prev) => {
        if (prev.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }

        return {
          ...prev,
          error: `Please keep uploads under ${maxFileSizeMb}MB.`,
          file: null,
          previewUrl: null
        };
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setState((prev) => {
      if (prev.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      return {
        ...prev,
        file,
        previewUrl,
        error: null
      };
    });
  }, [acceptedMimeTypes, maxFileSizeBytes, maxFileSizeMb]);

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0] ?? null;
      setFile(selected);
    },
    [setFile]
  );

  const onDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const dropped = event.dataTransfer.files?.[0] ?? null;
      setState((prev) => ({ ...prev, isDragging: false }));
      setFile(dropped);
    },
    [setFile]
  );

  const clear = useCallback(() => {
    setFile(null);
  }, [setFile]);

  useEffect(() => {
    return () => {
      if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }
    };
  }, [state.previewUrl]);

  return useMemo(
    () => ({
      file: state.file,
      previewUrl: state.previewUrl,
      error: state.error,
      isDragging: state.isDragging,
      acceptedMimeTypes,
      maxFileSizeMb,
      onInputChange,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
      clear
    }),
    [state, acceptedMimeTypes, maxFileSizeMb, onInputChange, onDragEnter, onDragOver, onDragLeave, onDrop, clear]
  );
}
