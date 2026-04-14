import {
  ApiRequestError,
  ENHANCE_ENDPOINT,
  bearerAuthHeaders,
  buildLargeUploadApiUrl,
  getBackendOrigin,
  parseJsonSafely
} from "@/lib/api/client";

export type EnhanceImageResult = {
  enhancedImageUrl: string | null;
  extractedText: string;
  metadata: Record<string, unknown> | null;
  raw: unknown;
};

const IMAGE_URL_KEYS = [
  "enhanced_image_url",
  "enhancedImageUrl",
  "enhanced_image",
  "output_url",
  "outputUrl",
  "result_url",
  "resultUrl",
  "image_url",
  "imageUrl",
  "output_path"
];

const EXTRACTED_TEXT_KEYS = ["extracted_text", "extractedText", "ocr_text", "ocrText", "text"];

export async function enhanceImageRequest(
  file: File,
  signal?: AbortSignal,
  accessToken?: string | null
): Promise<EnhanceImageResult> {
  const formData = new FormData();
  formData.append("file", file);

  const path = ENHANCE_ENDPOINT.startsWith("/") ? ENHANCE_ENDPOINT.slice(1) : ENHANCE_ENDPOINT;
  const url = buildLargeUploadApiUrl(`/${path}`);

  const response = await fetch(url, {
    method: "POST",
    headers: bearerAuthHeaders(accessToken ?? null),
    body: formData,
    signal
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Image processing failed.", {
      status: response.status,
      details: payload
    });
  }

  const data = extractDataNode(payload);
  const enhancedImageCandidate =
    pickFirstString(data, IMAGE_URL_KEYS) ?? pickFirstString(payload, IMAGE_URL_KEYS);

  const enhancedImageUrl = normalizeResultImageUrl(enhancedImageCandidate);
  const extractedText =
    pickFirstString(data, EXTRACTED_TEXT_KEYS) ?? pickFirstString(payload, EXTRACTED_TEXT_KEYS) ?? "";

  return {
    enhancedImageUrl,
    extractedText,
    metadata: toRecord((data as Record<string, unknown>)?.metadata) ?? toRecord((payload as Record<string, unknown>)?.metadata),
    raw: payload
  };
}

function extractDataNode(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const data = (payload as Record<string, unknown>).data;
  return data ?? payload;
}

function pickFirstString(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeResultImageUrl(candidate: string | null): string | null {
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith("blob:") || candidate.startsWith("data:")) {
    return candidate;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (looksLikeFilesystemPath(candidate)) {
    return null;
  }

  const backendOrigin = getBackendOrigin();
  if (!backendOrigin) {
    return candidate.startsWith("/") ? candidate : `/${candidate.replace(/^\/+/, "")}`;
  }

  const normalized = candidate.replace(/^\/+/, "");
  return `${backendOrigin}/${normalized}`;
}

function looksLikeFilesystemPath(path: string): boolean {
  return (
    path.startsWith("/home/") ||
    path.startsWith("/tmp/") ||
    path.startsWith("/var/") ||
    /^[A-Za-z]:[\\/]/.test(path)
  );
}

function toRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}

function readErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const directMessage = ["message", "detail", "error"].find((key) => {
    const value = record[key];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (directMessage) {
    return String(record[directMessage]);
  }

  const details = record.detail;
  if (Array.isArray(details) && details.length > 0) {
    const first = details[0];
    if (typeof first === "string") {
      return first;
    }
    if (first && typeof first === "object" && typeof (first as { msg?: unknown }).msg === "string") {
      return (first as { msg: string }).msg;
    }
  }

  return null;
}
