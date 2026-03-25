import { NavLink } from "@/components/admin/NavLink";
import { LayoutDashboard, ClipboardList, Calendar, UserCircle, Bell, LogOut, Clock, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { clearEmployeeAuth } from "@/Employee/lib/auth";
import { employeeApiFetch } from "@/Employee/lib/api";

const navItemsBase = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employee", end: true },
  { icon: ClipboardList, label: "My Tasks", path: "/employee/tasks" },
  { icon: Calendar, label: "Events", path: "/employee/schedule" },
  { icon: Clock, label: "Time Tracking", path: "/employee/clocked" },
  { icon: MessageCircle, label: "Messages", path: "/employee/messages" },
  { icon: UserCircle, label: "Profile", path: "/employee/profile" },
  { icon: Bell, label: "Notifications", path: "/employee/notifications" },
];

type SidebarMode = "desktop" | "mobile";

interface EmployeeSidebarProps {
  mode?: SidebarMode;
  onNavigate?: () => void;
}

export function EmployeeSidebar({ mode = "desktop", onNavigate }: EmployeeSidebarProps) {
  const navigate = useNavigate();

  const isMobile = mode === "mobile";

  const handleNavigate = () => {
    if (isMobile) {
      onNavigate?.();
    }
  };

  const onLogout = async () => {
    try {
      await employeeApiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore errors
    }
    clearEmployeeAuth();
    localStorage.removeItem("token");
    onNavigate?.();
    navigate("/login/employee", { replace: true });
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
        {navItemsBase.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={(item as any).end}
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
