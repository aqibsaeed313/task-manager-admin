import { NavLink } from "@/components/manger/NavLink";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  Clock,
  Car,
  Wrench,
  MapPin,
  UserX,
  ClipboardCheck,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/manger/utils";
import { clearAuthState } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/manger/api";
import { getAuthState } from "@/lib/auth";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/manager", end: true },
  { icon: ClipboardList, label: "Tasks", path: "/manager/tasks" },
  { icon: Users, label: "Employees", path: "/manager/employees" },
  { icon: Calendar, label: "Scheduling", path: "/manager/scheduling" },
  { icon: Clock, label: "Time Tracking", path: "/manager/time-tracking" },
  { icon: Car, label: "Vehicles", path: "/manager/vehicles" },
  { icon: Wrench, label: "Appliances", path: "/manager/appliances" },
  { icon: MapPin, label: "Locations", path: "/manager/locations" },
  { icon: UserX, label: "Do Not Hire", path: "/manager/do-not-hire" },
  { icon: ClipboardCheck, label: "Onboarding", path: "/manager/onboarding" },
  { icon: BarChart3, label: "Reports", path: "/manager/reports" },
  { icon: MessageSquare, label: "Messages", path: "/manager/messages" },
];

type SidebarMode = "desktop" | "mobile";

interface SidebarProps {
  mode?: SidebarMode;
  onNavigate?: () => void;
}

export function Sidebar({ mode = "desktop", onNavigate }: SidebarProps) {
  const navigate = useNavigate();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{ item: { fullName?: string; email?: string; role?: string } }>("/api/settings");
    },
  });

  const auth = getAuthState();
  const fullName = String(settingsQuery.data?.item?.fullName || "").trim() || "User";
  const email = String(settingsQuery.data?.item?.email || "").trim();
  const role = String(settingsQuery.data?.item?.role || auth.role || "").trim();
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onLogout = () => {
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
          : "fixed left-0 top-36 bottom-0 w-20 bg-gradient-to-b from-[#0b2f6b] via-[#10428b] to-[#0a2a5c] shadow-floating animate-slide-in"
      )}
    >
      {/* Top icon */}
      <div className="flex items-center justify-center h-20 border-b border-white/10">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/40 shadow-md">
          <ClipboardList className="h-5 w-5 text-[#ffdf70]" />
        </div>
      </div>

      {/* Navigation icons */}
      <nav className="flex-1 flex flex-col items-center gap-2 py-4 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white transition-colors",
              isMobile && "h-10 w-full rounded-xl justify-start px-4 gap-3"
            )}
            activeClassName={cn(
              "bg-white text-[#0b3f86] shadow-md",
              isMobile && "bg-white/90"
            )}
            onClick={handleNavigate}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {isMobile && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer with settings / logout / user */}
      <div className={cn(
        "border-t border-white/10 px-3 pb-4 pt-3",
        isMobile ? "space-y-3" : "space-y-2 flex flex-col items-center"
      )}>
        <NavLink
          to="/manager/settings"
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-full text-white/70 hover:bg-white/15 hover:text-white transition-colors",
            isMobile && "w-full rounded-xl justify-start px-4 gap-3"
          )}
          activeClassName={cn(
            "bg-white text-[#0b3f86] shadow-md",
            isMobile && "bg-white/90"
          )}
          onClick={handleNavigate}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {isMobile && <span className="text-sm font-medium">Settings</span>}
        </NavLink>

        <button
          type="button"
          onClick={onLogout}
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-full text-white/80 hover:bg-red-500/20 hover:text-red-100 transition-colors",
            isMobile && "w-full rounded-xl justify-start px-4 gap-3"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {isMobile && <span className="text-sm font-medium">Logout</span>}
        </button>

        {!isMobile && (
          <div className="mt-2 flex flex-col items-center gap-1 text-[11px] text-white/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold">
              {initials || "U"}
            </div>
            <span className="max-w-[4.5rem] truncate">{fullName}</span>
          </div>
        )}

        {isMobile && (
          <div className="mt-2 p-3 rounded-lg bg-white/10 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fullName}</p>
              <p className="text-xs text-white/80 truncate">
                {email || role || auth.username || ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
