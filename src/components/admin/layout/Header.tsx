import { cn } from "@/lib/utils";
import { Bell, Menu, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { clearAuthState } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/admin/apiClient";
import { getAuthState } from "@/lib/auth";

type MessageApi = {
  id: string;
  _id?: string;
  title?: string;
  content?: string;
  timestamp?: string;
  createdAt?: string;
  type?: "direct" | "broadcast";
  status?: "sent" | "delivered" | "read";
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();

  const auth = getAuthState();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{ item: { fullName?: string; email?: string; role?: string } }>("/api/settings");
    },
  });

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      return apiFetch<{ item: { name?: string; email?: string; username?: string } }>("/api/auth/me");
    },
  });

  const settingsFullName = String(settingsQuery.data?.item?.fullName || "").trim();
  const settingsEmail = String(settingsQuery.data?.item?.email || "").trim();
  const meName = String(meQuery.data?.item?.name || "").trim();
  const meEmail = String(meQuery.data?.item?.email || "").trim();

  const fullName = settingsFullName || meName || auth.username || "Admin";
  const email = settingsEmail || meEmail || "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await apiFetch<{ items?: MessageApi[] } | MessageApi[]>("/api/messages");
      const items = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      return items
        .map((m: any) => ({
          ...m,
          id: String(m.id || m._id || ""),
        }))
        .filter((m: any) => Boolean(m.id));
    },
  });

  const notifications = (notificationsQuery.data || [])
    .slice()
    .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
    .slice(0, 3);

  const unreadCount = (notificationsQuery.data || []).filter((n) => n.status !== "read").length;

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/messages/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "read" }),
      });
      await notificationsQuery.refetch();
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6">
      
      {/* Left Section - Menu Button & Search */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
          onClick={() => onMenuClick?.()}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Search Bar - Responsive */}
        <div className="relative flex-1 min-w-0 max-w-[140px] sm:max-w-md md:max-w-lg lg:max-w-xl">
          {/* Mobile Search Icon Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 flex-shrink-0 absolute left-0 top-1/2 -translate-y-1/2"
            aria-label="Search"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>
          
          {/* Desktop Search Input */}
          <Input
            placeholder="Search tasks, employees, locations..."
            className={cn(
              "pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-accent",
              "hidden md:flex",
              "h-9 sm:h-10 text-sm"
            )}
          />
          
          {/* Mobile Search Hint - Compact */}
          <div className="flex md:hidden items-center justify-end pr-2">
            <span className="text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">Search...</span>
          </div>
        </div>
      </div>

      {/* Right Section - Notifications & User Menu */}
      <div className="flex items-center gap-1 sm:gap-3 md:gap-4 flex-shrink-0 ml-2">
        
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-[10px] sm:text-xs">
                  {Math.min(unreadCount, 9)}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-[90vw] sm:w-80 max-w-sm mr-2 sm:mr-0"
          >
            <DropdownMenuLabel className="text-sm sm:text-base">
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {notifications.length === 0 ? (
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-2 sm:py-3 px-3 sm:px-4">
                <span className="text-xs sm:text-sm text-muted-foreground">No notifications</span>
              </DropdownMenuItem>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1 py-2 sm:py-3 px-3 sm:px-4"
                  onClick={() => {
                    void markRead(n.id);
                    navigate("/admin/messaging");
                  }}
                >
                  <span className="font-medium text-xs sm:text-sm">
                    {String(n.title || "Notification")}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {String(n.content || "")}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {String(n.timestamp || n.createdAt || "")}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 h-9 sm:h-10"
            >
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="bg-accent text-accent-foreground text-xs sm:text-sm">
                  {initials || "AD"}
                </AvatarFallback>
              </Avatar>
              
              {/* User Info - Hidden on mobile, visible on tablet+ */}
              <div className="text-left hidden sm:block">
                <p className="text-xs sm:text-sm font-medium leading-tight">{fullName}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{email || ""}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-[90vw] sm:w-56 mr-2 sm:mr-0"
          >
            <DropdownMenuLabel className="text-xs sm:text-sm">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              className="text-xs sm:text-sm py-2 sm:py-1.5"
              onClick={() => navigate("/admin/profile")}
            >
              <User className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="text-xs sm:text-sm py-2 sm:py-1.5"
              onClick={() => navigate("/admin/settings")}
            >
              Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              className="text-destructive text-xs sm:text-sm py-2 sm:py-1.5"
              onClick={() => {
                clearAuthState();
                navigate("/login", { replace: true });
              }}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
