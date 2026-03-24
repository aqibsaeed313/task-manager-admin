import { NavLink } from "@/components/admin/NavLink";
import { Bug, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { clearAuthState } from "@/lib/auth";

const navItemsBase = [{ icon: Bug, label: "Bugs", path: "/developer/bugs", end: true }];

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
    if (isMobile) onNavigate?.();
  };

  return (
    <aside
      className={cn(
        "flex flex-col text-white",
        isMobile
          ? "h-full w-64 bg-gradient-to-b from-[#0b2f6b] via-[#10428b] to-[#0a2a5c]"
          : "fixed left-0 top-36 bottom-0 w-56 bg-gradient-to-b from-[#0b2f6b] via-[#10428b] to-[#0a2a5c] shadow-floating animate-slide-in border-r-2 border-white/20",
      )}
    >
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4 overflow-y-auto overflow-x-hidden no-scrollbar mt-4">
        {navItemsBase.map((item) => (
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
