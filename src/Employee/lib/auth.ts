export interface EmployeeAuthState {
  token: string;
  username: string;
  name?: string;
  role: "employee";
  expiresAt: number;
}

const STORAGE_KEY = "employee_auth";

export function setEmployeeAuth(state: EmployeeAuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getEmployeeAuth(): EmployeeAuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmployeeAuthState;
    // Check expiration
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearEmployeeAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isEmployeeAuthenticated(): boolean {
  return !!getEmployeeAuth();
}
