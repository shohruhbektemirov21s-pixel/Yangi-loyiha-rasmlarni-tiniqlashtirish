import {
  ApiRequestError,
  HISTORY_DELETE_ENDPOINT_TEMPLATE,
  HISTORY_ENDPOINT,
  RESULT_ENDPOINT_TEMPLATE,
  UPLOAD_ENDPOINT,
  buildApiUrl,
  getBackendOrigin,
  parseJsonSafely
} from "@/lib/api/client";

export type ImageJobStatus = "uploaded" | "processing" | "completed" | "failed" | string;

export type UsageQuotaData = {
  usageDate: string | null;
  uploadsUsed: number;
  uploadsLimit: number;
  uploadsRemaining: number;
};

export type UploadImageJobData = {
  id: string;
  status: ImageJobStatus;
  planCode: string | null;
  originalFilename: string;
  originalImageUrl: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  usage: UsageQuotaData | null;
};

export type ImageJobResultData = {
  id: string;
  status: ImageJobStatus;
  planCode: string | null;
  detectedMode: string | null;
  originalImageUrl: string | null;
  enhancedImageUrl: string | null;
  extractedText: string;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
};

export type ProcessingHistoryItem = {
  id: string;
  status: ImageJobStatus;
  planCode: string | null;
  originalFilename: string;
  contentType: string | null;
  sizeBytes: number | null;
  detectedMode: string | null;
  originalImageUrl: string | null;
  enhancedImageUrl: string | null;
  outputPath: string | null;
  extractedText: string;
  createdAt: string | null;
  updatedAt: string | null;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
};

export type ProcessingHistoryResult = {
  items: ProcessingHistoryItem[];
  total: number;
  limit: number;
  offset: number;
};

export async function uploadImageJob(
  file: File,
  options: { signal?: AbortSignal; authToken?: string } = {}
): Promise<UploadImageJobData> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(buildApiUrl(UPLOAD_ENDPOINT), {
    method: "POST",
    body: formData,
    signal: options.signal,
    headers: buildAuthHeaders(options.authToken),
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Upload failed.", {
      status: response.status,
      details: payload
    });
  }

  const data = readDataObject(payload);

  const id = pickString(data, ["id"]);
  if (!id) {
    throw new ApiRequestError("Upload response did not include job id.", {
      status: response.status,
      details: payload
    });
  }

  return {
    id,
    status: pickString(data, ["status"]) || "uploaded",
    planCode: pickString(data, ["plan_code", "planCode"]),
    originalFilename: pickString(data, ["original_filename", "originalFilename"]) || file.name,
    originalImageUrl: normalizeAssetUrl(
      pickString(data, ["original_image_url", "originalImageUrl", "upload_url", "uploadUrl"])
    ),
    contentType: pickString(data, ["content_type", "contentType"]) || file.type || null,
    sizeBytes: pickNumber(data, ["size_bytes", "sizeBytes"]) ?? file.size,
    usage: mapUsageQuota(readObject(data.usage))
  };
}

export async function getImageJobResult(
  imageId: string,
  options: { processIfPending?: boolean; signal?: AbortSignal; authToken?: string } = {}
): Promise<ImageJobResultData> {
  const endpoint = buildResultEndpoint(imageId, options.processIfPending ?? true);

  const response = await fetch(buildApiUrl(endpoint), {
    method: "GET",
    signal: options.signal,
    headers: buildAuthHeaders(options.authToken),
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Failed to fetch processing result.", {
      status: response.status,
      details: payload
    });
  }

  const data = readDataObject(payload);

  const id = pickString(data, ["id"]) || imageId;
  const extractedText = pickString(data, ["extracted_text", "extractedText", "text"]) || "";
  const metadata = readObject((data as Record<string, unknown>).metadata);
  const detectedMode =
    pickString(data, ["detected_mode", "detectedMode"]) ||
    (metadata ? pickString(metadata, ["detected_mode", "detectedMode", "profile"]) : null);

  return {
    id,
    status: pickString(data, ["status"]) || "uploaded",
    planCode: pickString(data, ["plan_code", "planCode"]),
    detectedMode,
    originalImageUrl: normalizeAssetUrl(
      pickString(data, ["original_image_url", "originalImageUrl", "upload_url", "uploadUrl"])
    ),
    enhancedImageUrl: normalizeAssetUrl(
      pickString(data, ["enhanced_image_url", "enhancedImageUrl", "output_url", "outputUrl"])
    ),
    extractedText,
    errorMessage: pickString(data, ["error_message", "errorMessage"]),
    metadata
  };
}

export async function getProcessingHistory(
  options: { limit?: number; offset?: number; signal?: AbortSignal; authToken?: string } = {}
): Promise<ProcessingHistoryResult> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const query = new URLSearchParams();
  query.set("limit", String(limit));
  query.set("offset", String(offset));
  const endpoint = `${HISTORY_ENDPOINT}${HISTORY_ENDPOINT.includes("?") ? "&" : "?"}${query.toString()}`;
  const response = await fetch(buildApiUrl(endpoint), {
    method: "GET",
    signal: options.signal,
    headers: buildAuthHeaders(options.authToken),
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Failed to fetch processing history.", {
      status: response.status,
      details: payload
    });
  }

  const data = readDataObject(payload);
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.map((item) => mapHistoryItem(item));

  return {
    items,
    total: pickNumber(data, ["total"]) ?? items.length,
    limit: pickNumber(data, ["limit"]) ?? limit,
    offset: pickNumber(data, ["offset"]) ?? offset
  };
}

export async function deleteProcessingHistoryItem(
  imageId: string,
  options: { signal?: AbortSignal; authToken?: string } = {}
): Promise<{ id: string }> {
  const encodedId = encodeURIComponent(imageId);
  const endpoint = HISTORY_DELETE_ENDPOINT_TEMPLATE.includes("{image_id}")
    ? HISTORY_DELETE_ENDPOINT_TEMPLATE.replace("{image_id}", encodedId)
    : `/images/history/${encodedId}`;

  const response = await fetch(buildApiUrl(endpoint), {
    method: "DELETE",
    signal: options.signal,
    headers: buildAuthHeaders(options.authToken),
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Failed to delete history item.", {
      status: response.status,
      details: payload
    });
  }

  const data = readDataObject(payload);
  return {
    id: pickString(data, ["id"]) || imageId
  };
}

function buildResultEndpoint(imageId: string, processIfPending: boolean): string {
  const encodedId = encodeURIComponent(imageId);

  const template = RESULT_ENDPOINT_TEMPLATE.includes("{image_id}")
    ? RESULT_ENDPOINT_TEMPLATE.replace("{image_id}", encodedId)
    : `/images/${encodedId}/result`;

  const separator = template.includes("?") ? "&" : "?";
  return `${template}${separator}process_if_pending=${processIfPending ? "true" : "false"}`;
}

function normalizeAssetUrl(candidate: string | null): string | null {
  if (!candidate) {
    return null;
  }

  if (/^https?:\/\//i.test(candidate) || candidate.startsWith("blob:") || candidate.startsWith("data:")) {
    return candidate;
  }

  const backendOrigin = getBackendOrigin();
  if (candidate.startsWith("/")) {
    if (!backendOrigin) {
      return candidate;
    }
    return `${backendOrigin}${candidate}`;
  }

  if (looksLikeFilesystemPath(candidate)) {
    return null;
  }

  if (!backendOrigin) {
    return `/${candidate.replace(/^\/+/, "")}`;
  }

  return `${backendOrigin}/${candidate.replace(/^\/+/, "")}`;
}

function looksLikeFilesystemPath(path: string): boolean {
  return (
    path.startsWith("/home/") ||
    path.startsWith("/tmp/") ||
    path.startsWith("/var/") ||
    /^[A-Za-z]:[\\/]/.test(path)
  );
}

function readDataObject(payload: unknown): Record<string, unknown> {
  const root = readObject(payload);
  if (!root) {
    return {};
  }

  const nested = readObject(root.data);
  return nested || root;
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function mapHistoryItem(raw: unknown): ProcessingHistoryItem {
  const record = readObject(raw) || {};
  const extractedText = pickString(record, ["extracted_text", "extractedText", "text"]) || "";

  return {
    id: pickString(record, ["id"]) || "",
    status: pickString(record, ["status"]) || "uploaded",
    planCode: pickString(record, ["plan_code", "planCode"]),
    originalFilename: pickString(record, ["original_filename", "originalFilename"]) || "Unknown file",
    contentType: pickString(record, ["content_type", "contentType"]),
    sizeBytes: pickNumber(record, ["size_bytes", "sizeBytes"]),
    detectedMode: pickString(record, ["detected_mode", "detectedMode"]),
    originalImageUrl: normalizeAssetUrl(
      pickString(record, ["original_image_url", "originalImageUrl", "upload_url", "uploadUrl"])
    ),
    enhancedImageUrl: normalizeAssetUrl(
      pickString(record, ["enhanced_image_url", "enhancedImageUrl", "output_url", "outputUrl"])
    ),
    outputPath: pickString(record, ["output_path", "outputPath"]),
    extractedText,
    createdAt: pickString(record, ["created_at", "createdAt"]),
    updatedAt: pickString(record, ["updated_at", "updatedAt"]),
    processingStartedAt: pickString(record, ["processing_started_at", "processingStartedAt"]),
    processingCompletedAt: pickString(record, ["processing_completed_at", "processingCompletedAt"])
  };
}

function mapUsageQuota(raw: Record<string, unknown> | null): UsageQuotaData | null {
  if (!raw) {
    return null;
  }

  return {
    usageDate: pickString(raw, ["usage_date", "usageDate"]),
    uploadsUsed: pickNumber(raw, ["uploads_used", "uploadsUsed"]) ?? 0,
    uploadsLimit: pickNumber(raw, ["uploads_limit", "uploadsLimit"]) ?? 0,
    uploadsRemaining: pickNumber(raw, ["uploads_remaining", "uploadsRemaining"]) ?? 0
  };
}

function buildAuthHeaders(authToken?: string): Record<string, string> {
  if (!authToken) {
    return {};
  }
  return {
    Authorization: `Bearer ${authToken}`,
  };
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
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric;
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
  if (direct && direct.toLowerCase() !== "validation failed.") {
    return direct;
  }

  const error = readObject(record.error);
  if (error) {
    const nested = pickString(error, ["message", "detail", "code"]);
    if (nested) {
      return nested;
    }
  }

  const detail = record.detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") {
      return first;
    }

    const firstObj = readObject(first);
    if (firstObj) {
      const nested = pickString(firstObj, ["msg", "message"]);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}
