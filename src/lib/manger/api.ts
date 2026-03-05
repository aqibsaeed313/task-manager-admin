type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type StoredAuth = {
  token?: string | null;
};

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem("taskflow_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    return typeof parsed.token === "string" && parsed.token ? parsed.token : null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = "https://task.se7eninc.com";
  const url = `${String(baseUrl).replace(/\/$/, "")}${path}`;

  const token = getStoredToken();

  const isFormData =
    typeof FormData !== "undefined" &&
    !!options.body &&
    options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string> | undefined) || {}),
  };

  if (!isFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

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
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
