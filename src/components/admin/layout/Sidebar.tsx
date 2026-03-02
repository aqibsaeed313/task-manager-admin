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
  Settings,
  LogOut,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { clearAuthState } from "@/lib/auth";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", end: true },
  { icon: Users, label: "User Management", path: "/admin/users" },
  { icon: CheckSquare, label: "Task Management", path: "/admin/tasks" },
  { icon: UserCircle, label: "Employee Directory", path: "/admin/employees" },
  { icon: Wrench, label: "Appliances", path: "/admin/appliances" },
  { icon: Car, label: "Vehicles", path: "/admin/vehicles" },
  { icon: MapPin, label: "Locations", path: "/admin/locations" },
  { icon: Calendar, label: "Scheduling", path: "/admin/scheduling" },
  { icon: Clock, label: "Time Tracking", path: "/admin/time-tracking" },
  { icon: MessageSquare, label: "Messaging", path: "/admin/messaging" },
  { icon: UserX, label: "Do Not Hire", path: "/admin/do-not-hire" },
  { icon: ClipboardList, label: "Onboarding", path: "/admin/onboarding" },
  { icon: BarChart3, label: "Reports", path: "/admin/reports" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

type SidebarMode = "desktop" | "mobile";

interface SidebarProps {
  mode?: SidebarMode;
  onNavigate?: () => void;
}

export function Sidebar({ mode = "desktop", onNavigate }: SidebarProps) {
  const navigate = useNavigate();

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
          : "fixed left-0 top-36 bottom-0 w-20 bg-gradient-to-b from-[#0b2f6b] via-[#10428b] to-[#0a2a5c] shadow-floating animate-slide-in border-r-2 border-white/20"
      )}
    >
      <nav className="flex-1 flex flex-col items-center gap-5 py-4 overflow-y-auto overflow-x-hidden no-scrollbar mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white transition-colors",
              isMobile && "h-10 w-full rounded-xl justify-start px-4 gap-3"
            )}
            activeClassName={cn("bg-white text-[#0b3f86] shadow-md", isMobile && "bg-white/90")}
            onClick={handleNavigate}
          >
            <item.icon className="h-6 w-6 flex-shrink-0" />
            {isMobile && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={cn("border-t border-white/10 px-3 pb-4 pt-3", isMobile ? "" : "flex flex-col items-center")}>
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
      </div>
    </aside>
  );
}