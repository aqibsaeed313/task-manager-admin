import { clearAuthState, getAuthState, setAuthState } from "@/lib/auth";

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

export function getApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_URL || "").trim();
  if (raw) return raw;
  // Always use Vercel backend URL
  // return "https://task.se7eninc.com";
  return "http://localhost:5000";
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // const baseUrl = "https://task.se7eninc.com";
  const baseUrl = getApiBaseUrl();
  const url = `${String(baseUrl).replace(/\/$/, "")}${path}`;

  const auth = getAuthState();
  const headers = new Headers(init?.headers);

  const isFormData =
    typeof FormData !== "undefined" &&
    !!init?.body &&
    init.body instanceof FormData;

  if (!headers.has("Content-Type") && init?.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (auth.isAuthenticated && auth.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    clearAuthState();
  }

  if (!res.ok) {
    const body = (await parseJsonSafe(res)) as ApiErrorBody | string | null;
    const msg = typeof body === "string" ? body : body?.error?.message;
    throw new Error(msg || `Request failed (${res.status})`);
  }

  return (await parseJsonSafe(res)) as T;
}

export type LoginResponse = {
  item: {
    token: string;
    username: string;
    role: "super-admin" | "admin" | "manager";
  };
};

export async function login(username: string, password: string) {
  const data = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, email: username, password }),
  });

  setAuthState({
    isAuthenticated: true,
    token: data.item.token,
    username: data.item.username,
    role: data.item.role,
  });

  return data;
}

export type CrudResource =
  | "tasks"
  | "users"
  | "employees"
  | "vehicles"
  | "locations"
  | "schedules"
  | "notifications"
  | "time-entries"
  | "onboarding"
  | "do-not-hire"
  | "companies";

type ListResponse<T> = { items?: T[] } | T[];

function resourcePath(resource: CrudResource) {
  if (resource === "time-entries") return "/api/time-entries";
  if (resource === "do-not-hire") return "/api/do-not-hire";
  if (resource === "companies") return "/api/companies";
  return `/api/${resource}`;
}

export async function listResource<T>(resource: CrudResource, params?: { q?: string }) {
  const qs = params?.q ? `?q=${encodeURIComponent(params.q)}` : "";
  const res = await apiFetch<ListResponse<T>>(`${resourcePath(resource)}${qs}`);
  if (Array.isArray(res)) return res;
  return res.items ?? [];
}

export async function createResource<T>(resource: CrudResource, payload: unknown) {
  return apiFetch<T>(resourcePath(resource), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateResource<T>(resource: CrudResource, id: string, payload: unknown) {
  return apiFetch<T>(`${resourcePath(resource)}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteResource(resource: CrudResource, id: string) {
  return apiFetch<{ ok: true }>(`${resourcePath(resource)}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
