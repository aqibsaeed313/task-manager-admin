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
  { icon: Settings, label: "Settings", path: "/manager/settings" },
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
          ? "h-full w-64 bg-gradient-to-b from-[#133767] via-[#133767] to-[#133767]"
          : "fixed left-0 top-36 bottom-0 w-20 bg-gradient-to-b from-[#133767] via-[#133767] to-[#133767] shadow-floating animate-slide-in border-r-2 border-white/20"
      )}
    >
      {/* Navigation icons */}
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
            activeClassName={cn(
              "bg-white text-[#0b3f86] shadow-md",
              isMobile && "bg-white/90"
            )}
            onClick={handleNavigate}
          >
            <item.icon className="h-6 w-6 flex-shrink-0" />
            {isMobile && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer - only Logout */}
      <div className={cn(
        "border-t border-white/10 px-3 pb-4 pt-3",
        isMobile ? "" : "flex flex-col items-center"
      )}>
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
