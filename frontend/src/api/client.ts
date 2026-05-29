const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

function getErrorMessage(status: number, body: string) {
  try {
    const data = JSON.parse(body) as { detail?: string; error?: string };
    return data.detail || data.error || body;
  } catch {
    return body || `HTTP ${status}`;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": window.Telegram?.WebApp.initData ?? "",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(getErrorMessage(response.status, body));
  }

  return response.json() as Promise<T>;
}
