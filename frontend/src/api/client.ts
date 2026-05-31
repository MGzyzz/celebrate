const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  path: string;
  body: string;

  constructor(message: string, status: number, path: string, body: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

function getErrorMessage(status: number, body: string) {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    const detail = typeof data.detail === "string" ? data.detail : "";
    const error = typeof data.error === "string" ? data.error : "";
    const code = typeof data.code === "string" ? data.code : "";
    const source = typeof data.source === "string" ? data.source : "";
    const meta = [source && `source=${source}`, code && `code=${code}`].filter(Boolean).join(", ");
    const suffix = meta ? ` (${meta})` : "";
    if (status === 403 && detail && error) {
      return `${detail} ${error}${suffix}`;
    }
    return `${detail || error || body}${suffix}`;
  } catch {
    return body || `HTTP ${status}`;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": window.Telegram?.WebApp.initData ?? "",
        ...init?.headers
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed.";
    throw new ApiError(`Network error while requesting ${path}: ${message}`, 0, path, "");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(`${getErrorMessage(response.status, body)} [${response.status} ${path}]`, response.status, path, body);
  }

  return response.json() as Promise<T>;
}
