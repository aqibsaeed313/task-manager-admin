export type UserRole = "super-admin" | "admin" | "manager";

export type Role = "super-admin" | "admin" | "manager" | "employee";

export type ModuleKey =
  | "dashboard"
  | "users"
  | "roles"
  | "tasks"
  | "employees"
  | "appliances"
  | "vehicles"
  | "locations"
  | "scheduling"
  | "time_tracking"
  | "messaging"
  | "do_not_hire"
  | "onboarding"
  | "reports"
  | "settings";

export type PermissionMatrix = Record<Role, Record<ModuleKey, boolean>>;

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  users: "User Management",
  roles: "Roles & Permissions",
  tasks: "Tasks",
  employees: "Employees",
  appliances: "Appliances",
  vehicles: "Vehicles",
  locations: "Locations",
  scheduling: "Scheduling",
  time_tracking: "Time Tracking",
  messaging: "Messaging",
  do_not_hire: "Do Not Hire",
  onboarding: "Onboarding",
  reports: "Reports",
  settings: "Settings",
};

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  "super-admin": Object.keys(MODULE_LABELS).reduce((acc, k) => {
    acc[k as ModuleKey] = true;
    return acc;
  }, {} as Record<ModuleKey, boolean>),
  admin: Object.keys(MODULE_LABELS).reduce((acc, k) => {
    acc[k as ModuleKey] = true;
    return acc;
  }, {} as Record<ModuleKey, boolean>),
  manager: {
    dashboard: true,
    users: false,
    roles: false,
    tasks: true,
    employees: true,
    appliances: true,
    vehicles: true,
    locations: true,
    scheduling: true,
    time_tracking: true,
    messaging: true,
    do_not_hire: true,
    onboarding: true,
    reports: true,
    settings: true,
  },
  employee: {
    dashboard: true,
    users: false,
    roles: false,
    tasks: true,
    employees: false,
    appliances: false,
    vehicles: false,
    locations: false,
    scheduling: true,
    time_tracking: true,
    messaging: true,
    do_not_hire: false,
    onboarding: false,
    reports: false,
    settings: false,
  },
};

export type AuthState = {
  isAuthenticated: boolean;
  role: UserRole | null;
  username: string | null;
  token: string | null;
};

const AUTH_STORAGE_KEY = "taskflow_auth";
const PERMISSIONS_STORAGE_KEY = "taskflow_permission_matrix";

const defaultState: AuthState = {
  isAuthenticated: false,
  role: null,
  username: null,
  token: null,
};

export function getAuthState(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      role:
        parsed.role === "super-admin" || parsed.role === "admin" || parsed.role === "manager"
          ? parsed.role
          : null,
      username: typeof parsed.username === "string" ? parsed.username : null,
      token: typeof parsed.token === "string" ? parsed.token : null,
    };
  } catch {
    return defaultState;
  }
}

export function setAuthState(next: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
}

export function clearAuthState(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getPermissionMatrix(): PermissionMatrix {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_PERMISSION_MATRIX;
    const parsed = JSON.parse(raw) as PermissionMatrix;
    return parsed;
  } catch {
    return DEFAULT_PERMISSION_MATRIX;
  }
}

export function setPermissionMatrix(next: PermissionMatrix): void {
  localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(next));
}
