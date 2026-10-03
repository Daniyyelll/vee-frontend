export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const data = body as { message?: unknown; detail?: unknown };
    if (typeof data.message === "string") return data.message;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map(
          (item: { loc?: string[]; msg?: string }) =>
            `${item.loc?.slice(1).join(".") || "Request"}: ${item.msg || "Invalid value"}`,
        )
        .join(". ");
    }
  }
  return status >= 500
    ? "The store is temporarily unavailable. Please try again."
    : "This request could not be completed. Please try again.";
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
};

let refreshAccessToken:
  ((expiredToken: string) => Promise<string | null>) | null = null;

export function setAuthRefreshHandler(
  handler: ((expiredToken: string) => Promise<string | null>) | null,
) {
  refreshAccessToken = handler;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      body:
        options.body instanceof FormData
          ? options.body
          : options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
      credentials: options.credentials ?? "omit",
      signal: controller.signal,
    });
    if (response.status === 204) return undefined as T;
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = errorMessage(body, response.status);
      if (
        response.status === 401 &&
        options.token &&
        message !== "Invalid current password."
      ) {
        if (!retried && refreshAccessToken) {
          const replacement = await refreshAccessToken(options.token);
          if (replacement) {
            return request<T>(path, { ...options, token: replacement }, true);
          }
        }
        window.dispatchEvent(
          new CustomEvent("vee-session-expired", { detail: options.token }),
        );
      }
      throw new ApiError(message, response.status);
    }
    if (!body || typeof body !== "object" || !("data" in body)) {
      throw new ApiError(
        "The store returned an unexpected response. Please try again.",
      );
    }
    return (body as { data: T }).data;
  } catch (error) {
    if (options.signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "The request took too long. Please try again."
        : "We couldn’t connect to the store. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export function imageUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const base = new URL(apiBase, window.location.origin);
    const resolved = new URL(value, base.origin);
    return ["http:", "https:"].includes(resolved.protocol)
      ? resolved.href
      : null;
  } catch {
    return null;
  }
}

export function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
