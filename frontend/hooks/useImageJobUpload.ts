"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { UploadImageJobData, uploadImageJob } from "@/lib/api/imageJobs";

type UploadJobState = {
  isUploading: boolean;
  error: string | null;
  latest: UploadImageJobData | null;
};

export function useImageJobUpload() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<UploadJobState>({
    isUploading: false,
    error: null,
    latest: null
  });

  const startUpload = useCallback(
    async (file: File, authToken?: string | null): Promise<UploadImageJobData> => {
      if (!authToken) {
        throw new ApiRequestError("You need to log in before uploading an image.");
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState((prev) => ({ ...prev, isUploading: true, error: null }));

      try {
        const result = await uploadImageJob(file, {
          signal: abortController.signal,
          authToken
        });
        setState({ isUploading: false, error: null, latest: result });
        return result;
      } catch (error) {
        if (abortController.signal.aborted) {
          throw new ApiRequestError("The upload was canceled.");
        }

        const message = normalizeUploadError(error);
        setState((prev) => ({ ...prev, isUploading: false, error: message }));
        throw new ApiRequestError(message, {
          status: error instanceof ApiRequestError ? error.status : undefined,
          details: error
        });
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    []
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({ isUploading: false, error: null, latest: null });
  }, []);

  return useMemo(
    () => ({
      isUploading: state.isUploading,
      error: state.error,
      latest: state.latest,
      startUpload,
      reset
    }),
    [state, startUpload, reset]
  );
}

function normalizeUploadError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Image upload failed.";
}
