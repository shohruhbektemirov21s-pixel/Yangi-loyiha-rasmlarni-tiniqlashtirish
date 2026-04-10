"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { EnhanceImageResult, enhanceImageRequest } from "@/lib/api/imageEnhance";

type EnhanceState = {
  isProcessing: boolean;
  error: string | null;
  result: EnhanceImageResult | null;
  sourceFileSignature: string | null;
};

export function useEnhanceImage() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<EnhanceState>({
    isProcessing: false,
    error: null,
    result: null,
    sourceFileSignature: null
  });

  const processImage = useCallback(async (file: File): Promise<EnhanceImageResult> => {
    const sourceFileSignature = getFileSignature(file);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const result = await enhanceImageRequest(file, abortController.signal);
      setState({ isProcessing: false, error: null, result, sourceFileSignature });
      return result;
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new ApiRequestError("The request was canceled.");
      }

      const message = getEnhanceErrorMessage(error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: message,
        result: null,
        sourceFileSignature
      }));
      throw new ApiRequestError(message, {
        status: error instanceof ApiRequestError ? error.status : undefined,
        details: error
      });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({ isProcessing: false, error: null, result: null, sourceFileSignature: null });
  }, []);

  return useMemo(
    () => ({
      isProcessing: state.isProcessing,
      error: state.error,
      result: state.result,
      sourceFileSignature: state.sourceFileSignature,
      processImage,
      reset
    }),
    [state, processImage, reset]
  );
}

export function getEnhanceErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while processing the image.";
}

export function getFileSignature(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
