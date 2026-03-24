import { NavLink } from "@/components/admin/NavLink";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  UserCircle,
  Wrench,
  Car,
  MapPin,
  Calendar,
  Clock,
  ClipboardList,
  UserX,
  BarChart3,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Building2,
  Landmark,
  Activity,
  History,
  Wallet,
  Database,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { clearAuthState, getAuthState } from "@/lib/auth";
import { useMemo } from "react";
import { apiFetch } from "@/lib/admin/apiClient";

const navItemsBase = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", end: true },
  { icon: Users, label: "User Management", path: "/admin/users" },
  { icon: CheckSquare, label: "Task Management", path: "/admin/tasks" },
  { icon: UserCircle, label: "Employee Directory", path: "/admin/employees" },
  { icon: Wallet, label: "Payroll", path: "/admin/payroll" },
  { icon: History, label: "Task History", path: "/admin/task-history" },
  { icon: Wrench, label: "Appliances", path: "/admin/appliances" },
  { icon: Car, label: "Vehicles", path: "/admin/vehicles" },
  { icon: MapPin, label: "Locations", path: "/admin/locations" },
  { icon: Landmark, label: "Companies", path: "/admin/companies" },
  { icon: Building2, label: "Vendors", path: "/admin/vendors" },
  { icon: Calendar, label: "Scheduling", path: "/admin/scheduling" },
  { icon: Clock, label: "Time Tracking", path: "/admin/time-tracking" },
  { icon: MessageSquare, label: "Messaging", path: "/admin/messaging" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  { icon: UserX, label: "Do Not Hire", path: "/admin/do-not-hire" },
  { icon: ClipboardList, label: "Onboarding", path: "/admin/onboarding" },
  { icon: BarChart3, label: "Reports", path: "/admin/reports" },
  { icon: Database, label: "Imported Asana Data", path: "/admin/asana-data" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

// Activity Logs only for super-admin
const activityLogNavItem = { icon: Activity, label: "Activity Logs", path: "/admin/activity-logs" };

type SidebarMode = "desktop" | "mobile";

interface SidebarProps {
  mode?: SidebarMode;
  onNavigate?: () => void;
}

export function Sidebar({ mode = "desktop", onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const auth = getAuthState();

  // Build nav items based on role
  const navItems = useMemo(() => {
    const items = [...navItemsBase];
    // Insert Activity Logs before Settings (for super-admin only)
    if (auth.role === "super-admin") {
      const settingsIndex = items.findIndex((i) => i.label === "Settings");
      items.splice(settingsIndex, 0, activityLogNavItem);
    }
    return items;
  }, [auth.role]);

  const onLogout = async () => {
    // Call logout API to log the activity
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
    }
    clearAuthState();
    onNavigate?.();
    navigate("/login", { replace: true });
  };

  const isMobile = mode === "mobile";

  const handleNavigate = () => {
    if (isMobile) {
      onNavigate?.();
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col text-white",
        isMobile
          ? "h-full w-64 bg-gradient-to-b from-[#0b2f6b] via-[#10428b] to-[#0a2a5c]"
          : "fixed left-0 top-36 bottom-0 w-56 bg-gradient-to-b from-[#0b2f6b] via-[#10428b] to-[#0a2a5c] shadow-floating animate-slide-in border-r-2 border-white/20"
      )}
    >
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4 overflow-y-auto overflow-x-hidden no-scrollbar mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-white/70 hover:bg-white/15 hover:text-white transition-colors"
            activeClassName="bg-white text-[#0b3f86] shadow-md"
            onClick={handleNavigate}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-2 pb-4 pt-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 h-10 rounded-lg px-3 text-white/80 hover:bg-red-500/20 hover:text-red-100 transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}