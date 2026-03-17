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

  // System notifications (broadcasts only)
  const notificationsQuery = useQuery({
    queryKey: ["manager-notifications"],
    queryFn: async () => {
      const res = await apiFetch<{ items?: MessageApi[] } | MessageApi[]>("/api/messages?type=broadcast");
      const items = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      return items
        .map((m: any) => ({
          ...m,
          id: String(m.id || m._id || ""),
        }))
        .filter((m: any) => Boolean(m.id));
    },
  });

  // Direct messages for message dropdown
  const messagesQuery = useQuery({
    queryKey: ["manager-messages-preview"],
    queryFn: async () => {
      const user = getAuthState().username || "manager";
      const res = await apiFetch<{ items: any[] }>(`/api/messages/conversations/${user}`);
      const items = res?.items || [];
      return items.slice(0, 4); // Last 4 conversations
    },
  });

  const notifications = (notificationsQuery.data || [])
    .slice()
    .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
    .slice(0, 4);

  const unreadCount = (notificationsQuery.data || []).filter((n) => n.status !== "read").length;
  const unreadMessageCount = (messagesQuery.data || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);

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
  const avatarUrl = (settings as any)?.avatarDataUrl || (settings as any)?.avatarUrl as string | undefined;
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "M";

  return (
    <div className="min-h-screen bg-[#e6f0ff]">
      {/* Top blue header with branding */}
      <header className="fixed top-0 left-0 md:left-20 right-0 z-30 shadow-floating">
        <div className="w-full bg-gradient-to-r from-[#133767] via-[#133767] to-[#133767]">
          <div className="hidden md:block fixed top-0 left-0 h-36 w-20 bg-gradient-to-r from-[#133767] via-[#133767] to-[#133767]" />
          <div className="relative flex h-20 sm:h-24 md:h-36 items-center justify-between px-3 sm:px-6 lg:px-10 py-2 md:py-4 animate-fade-in">
            {/* Left side: Seven logo - responsive */}
            <div className="flex items-center z-10">
              <img
                src="/seven logo.png"
                alt="SE7EN Inc. logo"
                className="h-14 sm:h-16 md:h-36 w-auto max-w-[180px] sm:max-w-[200px] md:max-w-[300px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
              />
            </div>

            {/* Center: Task Manager logo - admin style */}
            <div className="flex absolute left-1/2 -translate-x-1/2 items-center">
              <div className="relative">
                <div className="absolute inset-0 -z-10 blur-2xl bg-blue-400/30 scale-110 rounded-full" />
                <img
                  src="/clock2.png"
                  alt="TaskManager by Reardon"
                  className="h-12 sm:h-16 md:h-32 lg:h-40 w-auto max-w-[140px] sm:max-w-[190px] md:max-w-[280px] lg:max-w-[380px] object-contain mix-blend-screen opacity-95 [mask-image:radial-gradient(closest-side,black_79%,transparent_100%)]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-white z-10">
              {/* Notifications dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden sm:inline-flex relative h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
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
                          navigate("/manager/notifications");
                        }}
                      >
                        <span className="font-medium line-clamp-1">
                          {String(n.content || "")}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Messages icon - go to messages */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden sm:inline-flex relative h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
                    aria-label="Messages"
                  >
                    <Mail className="h-4 w-4" />
                    {unreadMessageCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-[10px]">
                        {Math.min(unreadMessageCount, 9)}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 mr-2">
                  <DropdownMenuSeparator />
                  {(messagesQuery.data || []).length === 0 ? (
                    <DropdownMenuItem className="text-xs text-muted-foreground">No messages</DropdownMenuItem>
                  ) : (
                    (messagesQuery.data || []).slice(0, 4).map((c) => (
                      <DropdownMenuItem
                        key={c.employee?.id || c.employee?.name}
                        className="flex items-start gap-3 py-3 text-xs"
                        onClick={() => navigate("/manager/messages", { state: { selectedEmployee: c.employee } })}
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium">{c.employee?.initials || c.employee?.name?.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{c.employee?.name}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {c.lastMessage?.content || "No messages yet"}
                          </p>
                        </div>
                        {c.unreadCount > 0 && (
                          <Badge className="h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-[9px] text-white flex-shrink-0">
                            {c.unreadCount}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Profile menu with avatar / initials */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="hidden sm:inline-flex items-center justify-center h-12 w-12 p-0 rounded-full bg-transparent hover:bg-transparent"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-12 w-12 border border-white/70">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-white/20 text-sm font-semibold">
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
        <main className="flex-1 min-h-screen md:ml-20 pt-20 sm:pt-24 md:pt-36">
          <div className="w-full pl-2 pr-2 py-6 sm:py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
