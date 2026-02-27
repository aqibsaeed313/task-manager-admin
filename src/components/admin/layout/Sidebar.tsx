import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { clearAuthState } from "@/lib/auth";
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
  MessageSquare,
  UserX,
  ClipboardList,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Menu, // Added for mobile toggle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/admin/apiClient";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  open?: boolean;
  onClose?: () => void;
}

const menuItems: { icon: any; label: string; path: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
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
];

const bottomItems: { icon: any; label: string; path: string }[] = [
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export function Sidebar({ collapsed, onToggle, open = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{ item: { companyName?: string } }>("/api/settings");
    },
  });

  const brandName = String(settingsQuery.data?.item?.companyName || "").trim() || "Task Manager";

  const NavItem = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === path;
    
    const content = (
      <Link
        to={path}
        onClick={() => {
          if (onClose) onClose();
        }}
        className={cn(
          "sidebar-item",
          isActive && "sidebar-item-active",
          // Responsive padding
          collapsed ? "justify-center px-2 py-2.5 sm:px-3 sm:py-2.5" : "px-3 py-2.5 sm:px-4 sm:py-3"
        )}
      >
        <Icon className={cn(
          "flex-shrink-0",
          collapsed ? "h-5 w-5 sm:h-5 sm:w-5" : "h-5 w-5 sm:h-5 sm:w-5"
        )} />
        {!collapsed && (
          <span className="truncate text-sm sm:text-base ml-3">{label}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            className="bg-primary text-primary-foreground text-xs sm:text-sm"
          >
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <>
      {/* Mobile Overlay - Improved backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => onClose?.()}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-all duration-300 animate-in fade-in"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar flex flex-col transition-all duration-300 z-50",
          // Width - responsive: full width on mobile, normal width on desktop
          collapsed 
            ? "w-[72px] sm:w-20" 
            : "w-[85vw] sm:w-72 md:w-64",
          // Mobile positioning
          "-translate-x-full md:translate-x-0",
          open && "translate-x-0",
          // Shadow for mobile
          "shadow-xl md:shadow-none"
        )}
      >
        {/* Logo Section - Responsive */}
        <div className={cn(
          "h-14 sm:h-16 flex items-center px-3 sm:px-4 border-b border-sidebar-border",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-sidebar-primary-foreground" />
              </div>
              <span className="font-semibold text-sm sm:text-base text-sidebar-foreground truncate">
                {brandName}
              </span>
            </div>
          )}
          
          {/* Toggle Button - Hidden on mobile when collapsed? No, always show */}
          <button
            onClick={onToggle}
            className={cn(
              "h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-sidebar-accent flex items-center justify-center",
              "text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
              "transition-colors flex-shrink-0",
              collapsed && "ml-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>

        {/* Main Navigation - Responsive scroll */}
        <nav className="flex-1 p-2 sm:p-3 space-y-0.5 sm:space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          {menuItems.map((item) => (
            <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
          ))}
        </nav>

        {/* Bottom Navigation - Responsive */}
        <div className={cn(
          "p-2 sm:p-3 space-y-0.5 sm:space-y-1 border-t border-sidebar-border",
          collapsed ? "items-center" : ""
        )}>
          {bottomItems.map((item) => (
            <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
          ))}
          
          {/* Logout Button */}
          <button
            onClick={() => {
              clearAuthState();
              navigate("/login", { replace: true });
            }}
            className={cn(
              "sidebar-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive",
              "transition-colors duration-200",
              collapsed ? "justify-center px-2 py-2.5 sm:px-3 sm:py-2.5" : "px-3 py-2.5 sm:px-4 sm:py-3"
            )}
          >
            <LogOut className={cn(
              "h-5 w-5 sm:h-5 sm:w-5 flex-shrink-0",
              collapsed ? "" : "mr-3"
            )} />
            {!collapsed && <span className="text-sm sm:text-base">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header Toggle - Only visible on mobile when sidebar is closed */}
      {!open && !collapsed && (
        <button
          onClick={onToggle}
          className="fixed top-3 left-3 z-30 md:hidden h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-accent-foreground shadow-md"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
}