type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type StoredAuth = {
  token?: string | null;
};

function resolveApiBaseUrl(): string {
  return "https://task-manager-backend-theta-ten.vercel.app";
}

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem("taskflow_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    return typeof parsed.token === "string" && parsed.token ? parsed.token : null;
  } catch (err) {
    void err;
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  const trimmedBase = String(baseUrl).replace(/\/$/, "");
  const url = trimmedBase ? `${trimmedBase}${path}` : path;

  const token = getStoredToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as ApiErrorPayload;
      message = data?.error?.message || message;
    } catch (err) {
      void err;
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
