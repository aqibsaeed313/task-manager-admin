export type Role = "admin";

export type AuthState = {
  isAuthenticated: boolean;
  token?: string;
  user?: {
    name: string;
    role: Role;
  };
};

const AUTH_STORAGE_KEY = "taskflow_auth";

function normalizeRole(input: unknown): Role | null {
  if (input === "admin") return input;
  if (typeof input !== "string") return null;

  const value = input.trim().toLowerCase();
  if (value === "administrator") return "admin";
  if (value === "super-admin" || value === "superadmin") return "admin";
  if (value.includes("admin")) return "admin";

  return null;
}

export function getAuthState(): AuthState {
  const saved = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!saved) return { isAuthenticated: false };
  try {
    const parsed = JSON.parse(saved) as AuthState;
    if (typeof parsed?.isAuthenticated !== "boolean") return { isAuthenticated: false };

    if (!parsed.isAuthenticated) return { isAuthenticated: false };
    const role = normalizeRole((parsed as any)?.user?.role);
    const name = (parsed as any)?.user?.name;
    const token = (parsed as any)?.token;
    if (!role || typeof name !== "string" || !name.trim() || typeof token !== "string" || !token.trim()) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      token,
      user: {
        name,
        role,
      },
    };
  } catch {
    return { isAuthenticated: false };
  }
}

export function setAuthState(next: AuthState) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
