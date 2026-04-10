"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { ImageJobResultData, ImageJobStatus, getImageJobResult } from "@/lib/api/imageJobs";

const PENDING_STATUSES = new Set<ImageJobStatus>(["uploaded", "processing"]);

type UseImageJobResultOptions = {
  pollIntervalMs?: number;
  maxPollDurationMs?: number;
  authToken?: string | null;
  enabled?: boolean;
};

type ResultState = {
  result: ImageJobResultData | null;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
};

export function useImageJobResult(
  imageId: string,
  options: UseImageJobResultOptions = {}
) {
  const pollIntervalMs = options.pollIntervalMs ?? 1800;
  const maxPollDurationMs = options.maxPollDurationMs ?? 120000;
  const authToken = options.authToken ?? null;
  const enabled = options.enabled ?? true;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const [state, setState] = useState<ResultState>({
    result: null,
    isLoading: true,
    isPolling: false,
    error: null
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchOnce = useCallback(
    async (processIfPending: boolean): Promise<ImageJobResultData> => {
      abortRequest();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const result = await getImageJobResult(imageId, {
          processIfPending,
          signal: abortController.signal,
          authToken: authToken || undefined
        });

        if (!mountedRef.current) {
          return result;
        }

        setState((prev) => ({ ...prev, result, error: null }));
        return result;
      } catch (error) {
        if (abortController.signal.aborted) {
          throw new ApiRequestError("Request canceled.");
        }

        const message = normalizeResultError(error);
        if (mountedRef.current) {
          setState((prev) => ({ ...prev, error: message }));
        }

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
    [abortRequest, authToken, imageId]
  );

  const pollForUpdates = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed > maxPollDurationMs) {
      setState((prev) => ({ ...prev, isPolling: false }));
      return;
    }

    try {
      const result = await fetchOnce(true);
      if (PENDING_STATUSES.has(result.status.toLowerCase())) {
        setState((prev) => ({ ...prev, isPolling: true }));
        clearTimer();
        timerRef.current = setTimeout(() => {
          void pollForUpdates();
        }, pollIntervalMs);
      } else {
        setState((prev) => ({ ...prev, isPolling: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isPolling: false }));
    }
  }, [clearTimer, fetchOnce, maxPollDurationMs, pollIntervalMs]);

  const load = useCallback(async () => {
    if (!enabled) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isPolling: false,
        error: null
      }));
      return;
    }

    if (!authToken) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isPolling: false,
        error: "You need to log in to view this result."
      }));
      return;
    }

    clearTimer();
    startedAtRef.current = Date.now();

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await fetchOnce(true);
      if (PENDING_STATUSES.has(result.status.toLowerCase())) {
        setState((prev) => ({ ...prev, isPolling: true }));
        clearTimer();
        timerRef.current = setTimeout(() => {
          void pollForUpdates();
        }, pollIntervalMs);
      } else {
        setState((prev) => ({ ...prev, isPolling: false }));
      }
    } catch {
      // Error state is set in fetchOnce.
    } finally {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
  }, [authToken, clearTimer, enabled, fetchOnce, pollForUpdates, pollIntervalMs]);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    return () => {
      mountedRef.current = false;
      clearTimer();
      abortRequest();
    };
  }, [load, clearTimer, abortRequest]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return useMemo(
    () => ({
      result: state.result,
      isLoading: state.isLoading,
      isPolling: state.isPolling,
      error: state.error,
      refresh
    }),
    [state, refresh]
  );
}

function normalizeResultError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not fetch image result.";
}
