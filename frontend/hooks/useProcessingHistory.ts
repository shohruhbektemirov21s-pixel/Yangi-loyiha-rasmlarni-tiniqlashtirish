"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import {
  ProcessingHistoryItem,
  deleteProcessingHistoryItem,
  getProcessingHistory
} from "@/lib/api/imageJobs";

type UseProcessingHistoryOptions = {
  limit?: number;
  authToken?: string | null;
  enabled?: boolean;
};

type ProcessingHistoryState = {
  items: ProcessingHistoryItem[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  isRefreshing: boolean;
  deletingIds: Record<string, boolean>;
  error: string | null;
};

export function useProcessingHistory(options: UseProcessingHistoryOptions = {}) {
  const limit = options.limit ?? 24;
  const authToken = options.authToken ?? null;
  const enabled = options.enabled ?? true;

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<ProcessingHistoryState>({
    items: [],
    total: 0,
    limit,
    offset: 0,
    isLoading: true,
    isRefreshing: false,
    deletingIds: {},
    error: null
  });

  const abortCurrent = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!enabled) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: null
        }));
        return;
      }

      if (!authToken) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: "You need to log in to view processing history."
        }));
        return;
      }

      abortCurrent();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState((prev) => ({
        ...prev,
        isLoading: !isRefresh && prev.items.length === 0,
        isRefreshing: isRefresh,
        error: null
      }));

      try {
        const result = await getProcessingHistory({
          limit,
          offset: 0,
          signal: controller.signal,
          authToken
        });

        if (!mountedRef.current) {
          return;
        }

        setState((prev) => ({
          ...prev,
          items: result.items.filter((item) => Boolean(item.id)),
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          isLoading: false,
          isRefreshing: false,
          error: null
        }));
      } catch (error) {
        if (controller.signal.aborted || !mountedRef.current) {
          return;
        }

        const message = normalizeHistoryError(error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: message
        }));
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [abortCurrent, authToken, enabled, limit]
  );

  useEffect(() => {
    mountedRef.current = true;
    void load();

    return () => {
      mountedRef.current = false;
      abortCurrent();
    };
  }, [abortCurrent, load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const removeHistoryItem = useCallback(async (imageId: string) => {
    setState((prev) => ({
      ...prev,
      deletingIds: { ...prev.deletingIds, [imageId]: true }
    }));

    try {
      if (!authToken) {
        throw new ApiRequestError("You need to log in to manage history.");
      }

      await deleteProcessingHistoryItem(imageId, { authToken });

      if (!mountedRef.current) {
        return;
      }

      setState((prev) => {
        const nextDeleting = { ...prev.deletingIds };
        delete nextDeleting[imageId];

        const filteredItems = prev.items.filter((item) => item.id !== imageId);
        return {
          ...prev,
          items: filteredItems,
          total: Math.max(0, prev.total - 1),
          deletingIds: nextDeleting
        };
      });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      const message = normalizeHistoryError(error);
      setState((prev) => {
        const nextDeleting = { ...prev.deletingIds };
        delete nextDeleting[imageId];

        return {
          ...prev,
          deletingIds: nextDeleting,
          error: message
        };
      });

      throw new ApiRequestError(message, {
        status: error instanceof ApiRequestError ? error.status : undefined,
        details: error
      });
    }
  }, [authToken]);

  return useMemo(
    () => ({
      items: state.items,
      total: state.total,
      limit: state.limit,
      offset: state.offset,
      isLoading: state.isLoading,
      isRefreshing: state.isRefreshing,
      deletingIds: state.deletingIds,
      error: state.error,
      refresh,
      removeHistoryItem
    }),
    [state, refresh, removeHistoryItem]
  );
}

function normalizeHistoryError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not load processing history.";
}
