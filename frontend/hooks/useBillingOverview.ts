"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  BillingOverview,
  PlanCode,
  changeSubscriptionPlanRequest,
  getBillingOverviewRequest
} from "@/lib/api/billing";
import { ApiRequestError } from "@/lib/api/client";

type UseBillingOverviewOptions = {
  authToken?: string | null;
  enabled?: boolean;
};

type BillingOverviewState = {
  overview: BillingOverview | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
};

export function useBillingOverview(options: UseBillingOverviewOptions = {}) {
  const authToken = options.authToken ?? null;
  const enabled = options.enabled ?? true;

  const [state, setState] = useState<BillingOverviewState>({
    overview: null,
    isLoading: Boolean(enabled),
    isUpdating: false,
    error: null
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      setState((prev) => ({ ...prev, isLoading: false, error: null }));
      return null;
    }

    if (!authToken) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Please sign in to view plan usage."
      }));
      return null;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const overview = await getBillingOverviewRequest(authToken);
      setState((prev) => ({ ...prev, overview, isLoading: false, error: null }));
      return overview;
    } catch (error) {
      const message = normalizeBillingError(error);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, [authToken, enabled]);

  const changePlan = useCallback(
    async (targetPlanCode: PlanCode) => {
      if (!authToken) {
        throw new ApiRequestError("Please sign in to update your plan.");
      }

      setState((prev) => ({ ...prev, isUpdating: true, error: null }));

      try {
        const result = await changeSubscriptionPlanRequest(authToken, targetPlanCode);
        const refreshed = await getBillingOverviewRequest(authToken);
        setState((prev) => ({
          ...prev,
          overview: refreshed,
          isUpdating: false,
          error: null
        }));
        return result;
      } catch (error) {
        const message = normalizeBillingError(error);
        setState((prev) => ({ ...prev, isUpdating: false, error: message }));
        throw new ApiRequestError(message, {
          status: error instanceof ApiRequestError ? error.status : undefined,
          details: error
        });
      }
    },
    [authToken]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      overview: state.overview,
      isLoading: state.isLoading,
      isUpdating: state.isUpdating,
      error: state.error,
      refresh,
      changePlan
    }),
    [state, refresh, changePlan]
  );
}

function normalizeBillingError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not load billing details.";
}
