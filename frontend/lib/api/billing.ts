import {
  ApiRequestError,
  BILLING_OVERVIEW_ENDPOINT,
  BILLING_SUBSCRIPTION_ENDPOINT,
  buildApiUrl,
  parseJsonSafely
} from "@/lib/api/client";

export type PlanCode = "free" | "premium" | string;

export type PlanEntitlements = {
  dailyUploadLimit: number;
  priorityLevel: number;
  ocrMode: string;
  maxOutputShortSide: number | null;
};

export type PricingPlan = {
  code: PlanCode;
  name: string;
  description: string;
  monthlyPriceUsd: number;
  badgeText: string;
  outputQualityLabel: string;
  features: string[];
  entitlements: PlanEntitlements;
};

export type UsageSnapshot = {
  usageDate: string;
  uploadsUsed: number;
  uploadsLimit: number;
  uploadsRemaining: number;
};

export type BillingOverview = {
  plans: PricingPlan[];
  currentPlan: PlanCode;
  planStatus: string;
  planProvider: string;
  usage: UsageSnapshot;
};

export type ChangePlanResult = {
  currentPlan: PlanCode;
  planStatus: string;
  planProvider: string;
  usage: UsageSnapshot;
  notice: string | null;
  checkout: {
    provider: string;
    sessionId: string;
    checkoutUrl: string | null;
    status: string;
    message: string;
  } | null;
};

export async function getBillingOverviewRequest(authToken: string): Promise<BillingOverview> {
  const response = await fetch(buildApiUrl(BILLING_OVERVIEW_ENDPOINT), {
    method: "GET",
    headers: buildAuthHeaders(authToken)
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Failed to load billing overview.", {
      status: response.status,
      details: payload
    });
  }

  const data = readDataObject(payload);
  const plansRaw = Array.isArray(data.plans) ? data.plans : [];

  const plans = plansRaw.map((item) => mapPricingPlan(item)).filter((item) => Boolean(item.code));

  const usage = mapUsageSnapshot(readObject(data.usage) || {});
  return {
    plans,
    currentPlan: pickString(data, ["current_plan", "currentPlan"]) || "free",
    planStatus: pickString(data, ["plan_status", "planStatus"]) || "active",
    planProvider: pickString(data, ["plan_provider", "planProvider"]) || "placeholder",
    usage
  };
}

export async function changeSubscriptionPlanRequest(
  authToken: string,
  planCode: PlanCode
): Promise<ChangePlanResult> {
  const response = await fetch(buildApiUrl(BILLING_SUBSCRIPTION_ENDPOINT), {
    method: "POST",
    headers: {
      ...buildAuthHeaders(authToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      plan_code: planCode
    })
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Failed to update subscription.", {
      status: response.status,
      details: payload
    });
  }

  const data = readDataObject(payload);
  const checkout = readObject(data.checkout);

  return {
    currentPlan: pickString(data, ["current_plan", "currentPlan"]) || "free",
    planStatus: pickString(data, ["plan_status", "planStatus"]) || "active",
    planProvider: pickString(data, ["plan_provider", "planProvider"]) || "placeholder",
    usage: mapUsageSnapshot(readObject(data.usage) || {}),
    notice: pickString(data, ["notice"]),
    checkout: checkout
      ? {
          provider: pickString(checkout, ["provider"]) || "placeholder",
          sessionId: pickString(checkout, ["session_id", "sessionId"]) || "",
          checkoutUrl: pickString(checkout, ["checkout_url", "checkoutUrl"]),
          status: pickString(checkout, ["status"]) || "simulated",
          message: pickString(checkout, ["message"]) || ""
        }
      : null
  };
}

function mapPricingPlan(raw: unknown): PricingPlan {
  const record = readObject(raw) || {};
  const entitlements = readObject(record.entitlements) || {};
  return {
    code: pickString(record, ["code"]) || "free",
    name: pickString(record, ["name"]) || "Plan",
    description: pickString(record, ["description"]) || "",
    monthlyPriceUsd: pickNumber(record, ["monthly_price_usd", "monthlyPriceUsd"]) ?? 0,
    badgeText: pickString(record, ["badge_text", "badgeText"]) || "Plan",
    outputQualityLabel: pickString(record, ["output_quality_label", "outputQualityLabel"]) || "Standard output",
    features: Array.isArray(record.features)
      ? record.features.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : [],
    entitlements: {
      dailyUploadLimit: pickNumber(entitlements, ["daily_upload_limit", "dailyUploadLimit"]) ?? 0,
      priorityLevel: pickNumber(entitlements, ["priority_level", "priorityLevel"]) ?? 0,
      ocrMode: pickString(entitlements, ["ocr_mode", "ocrMode"]) || "standard",
      maxOutputShortSide: pickNumber(entitlements, ["max_output_short_side", "maxOutputShortSide"])
    }
  };
}

function mapUsageSnapshot(raw: Record<string, unknown>): UsageSnapshot {
  return {
    usageDate: pickString(raw, ["usage_date", "usageDate"]) || "",
    uploadsUsed: pickNumber(raw, ["uploads_used", "uploadsUsed"]) ?? 0,
    uploadsLimit: pickNumber(raw, ["uploads_limit", "uploadsLimit"]) ?? 0,
    uploadsRemaining: pickNumber(raw, ["uploads_remaining", "uploadsRemaining"]) ?? 0
  };
}

function buildAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`
  };
}

function readDataObject(payload: unknown): Record<string, unknown> {
  const root = readObject(payload);
  if (!root) {
    return {};
  }
  return readObject(root.data) || root;
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function readErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  const record = readObject(payload);
  if (!record) {
    return null;
  }

  const direct = pickString(record, ["message", "detail", "error"]);
  if (direct) {
    return direct;
  }

  const errorObj = readObject(record.error);
  if (errorObj) {
    const nested = pickString(errorObj, ["message", "detail"]);
    if (nested) {
      return nested;
    }
  }

  return null;
}
