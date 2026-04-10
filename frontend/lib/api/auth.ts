import {
  AUTH_LOGIN_ENDPOINT,
  AUTH_LOGOUT_ENDPOINT,
  AUTH_ME_ENDPOINT,
  AUTH_REGISTER_ENDPOINT,
  ApiRequestError,
  buildApiUrl,
  parseJsonSafely,
} from "@/lib/api/client";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
};

export type RegisterInput = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export async function registerRequest(input: RegisterInput): Promise<AuthSession> {
  const response = await fetch(buildApiUrl(AUTH_REGISTER_ENDPOINT), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      confirm_password: input.confirmPassword,
      full_name: input.fullName || null,
    }),
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Registration failed.", {
      status: response.status,
      details: payload,
    });
  }

  return mapAuthSession(payload);
}

export async function loginRequest(input: LoginInput): Promise<AuthSession> {
  const response = await fetch(buildApiUrl(AUTH_LOGIN_ENDPOINT), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Login failed.", {
      status: response.status,
      details: payload,
    });
  }

  return mapAuthSession(payload);
}

export async function logoutRequest(accessToken: string): Promise<void> {
  const response = await fetch(buildApiUrl(AUTH_LOGOUT_ENDPOINT), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Logout failed.", {
      status: response.status,
      details: payload,
    });
  }
}

export async function getMeRequest(accessToken: string): Promise<AuthUser> {
  const response = await fetch(buildApiUrl(AUTH_ME_ENDPOINT), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(readErrorMessage(payload) || "Authentication check failed.", {
      status: response.status,
      details: payload,
    });
  }

  const data = readDataObject(payload);
  return mapAuthUser(data);
}

function mapAuthSession(payload: unknown): AuthSession {
  const data = readDataObject(payload);
  const userData = readObject(data.user) || {};

  const accessToken = pickString(data, ["access_token", "accessToken"]);
  if (!accessToken) {
    throw new ApiRequestError("Authentication response did not include an access token.");
  }

  return {
    accessToken,
    tokenType: pickString(data, ["token_type", "tokenType"]) || "bearer",
    expiresIn: pickNumber(data, ["expires_in", "expiresIn"]) ?? 0,
    user: mapAuthUser(userData),
  };
}

function mapAuthUser(raw: Record<string, unknown>): AuthUser {
  const id = pickString(raw, ["id"]);
  const email = pickString(raw, ["email"]);
  const createdAt = pickString(raw, ["created_at", "createdAt"]);

  if (!id || !email || !createdAt) {
    throw new ApiRequestError("Authentication response contained invalid user data.");
  }

  return {
    id,
    email,
    fullName: pickString(raw, ["full_name", "fullName"]),
    isActive: pickBoolean(raw, ["is_active", "isActive"]) ?? true,
    createdAt,
  };
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

function pickBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.toLowerCase().trim();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
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

  const errorObj = readObject(record.error);
  if (errorObj) {
    const detailList = errorObj.details;
    if (Array.isArray(detailList) && detailList.length > 0) {
      const first = detailList[0];
      if (typeof first === "string" && first.trim()) {
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

    const nested = pickString(errorObj, ["message", "detail", "code"]);
    if (nested) {
      return nested;
    }
  }

  return null;
}
