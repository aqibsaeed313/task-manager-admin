import { Sidebar } from "./Sidebar";
import { ReactNode, useState } from "react";
import { Bell, Mail, Menu, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/manger/ui/sheet";
import { Button } from "@/components/manger/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/manger/ui/dropdown-menu";
import { Badge } from "@/components/manger/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/manger/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/manger/api";
import { getAuthState, clearAuthState } from "@/lib/auth";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const auth = getAuthState();

  type MessageApi = {
    id: string;
    _id?: string;
    title?: string;
    content?: string;
    timestamp?: string;
    createdAt?: string;
    status?: "sent" | "delivered" | "read";
  };

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{ item: { fullName?: string; email?: string; avatarUrl?: string } }>("/api/settings");
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["manager-notifications"],
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
    .slice(0, 4);

  const unreadCount = (notificationsQuery.data || []).filter((n) => n.status !== "read").length;

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/messages/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "read" }),
      });
      await notificationsQuery.refetch();
    } catch {
      // ignore errors
    }
  };

  const settings = settingsQuery.data?.item;
  const fullName = (settings?.fullName || auth.username || "Manager").trim();
  const email = (settings?.email || "").trim();
  const avatarUrl = (settings as any)?.avatarUrl as string | undefined;
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "M";

  return (
    <div className="min-h-screen bg-[#e6f0ff] pt-36">
      {/* Top blue header with branding */}
      <header className="fixed top-0 inset-x-0 z-30 shadow-floating">
        <div className="w-full bg-gradient-to-r from-[#0a2a5c] via-[#0e4b9d] to-[#0a2a5c]">
          <div className="relative flex h-36 items-center justify-between px-4 sm:px-6 lg:px-10 py-4 animate-fade-in">
            {/* Left: empty spacer for balance */}
            <div className="w-20" />

            {/* Left side: Seven logo positioned after sidebar */}
            <div className="absolute left-20 flex items-center">
              <img
                src="/seven logo.png"
                alt="SE7EN Inc. logo"
                className="h-36 sm:h-40 w-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
              />
            </div>

            {/* Center: Task Manager logo */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
              <img
                src="/taskmanager-by-reardon.svg"
                alt="TaskManager by Reardon"
                className="h-24 sm:h-28 w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-white z-10">
              {/* Notifications dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden sm:inline-flex h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-[10px]">
                        {Math.min(unreadCount, 9)}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 mr-2">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <DropdownMenuItem className="text-xs text-muted-foreground">
                      No notifications
                    </DropdownMenuItem>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className="flex flex-col items-start gap-0.5 text-xs"
                        onClick={() => {
                          void markRead(n.id);
                          navigate("/manager/messages");
                        }}
                      >
                        <span className="font-medium">
                          {String(n.title || "Notification")}
                        </span>
                        <span className="text-muted-foreground line-clamp-2">
                          {String(n.content || "")}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Messages icon - go to messages */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Messages"
                onClick={() => navigate("/manager/messages")}
              >
                <Mail className="h-4 w-4" />
              </Button>

              {/* Profile menu with avatar / initials */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="hidden sm:inline-flex items-center gap-2 h-9 px-2 rounded-full bg-white/10 hover:bg-white/20"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-7 w-7 border border-white/70">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={fullName} />
                      ) : (
                        <AvatarFallback className="bg-white/20 text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mr-2">
                  <DropdownMenuLabel className="text-xs">
                    {fullName}
                    {email && (
                      <span className="block text-[11px] text-muted-foreground">{email}</span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => navigate("/manager/settings")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile & Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs text-destructive"
                    onClick={() => {
                      clearAuthState();
                      navigate("/login", { replace: true });
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile nav trigger */}
              <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Open navigation"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <Sidebar mode="mobile" onNavigate={() => setMobileSidebarOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Body: left icon rail + content */}
      <div className="flex">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 min-h-[calc(100vh-9rem)] md:ml-20">
          <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-8 py-6 sm:py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
