import { Bell, Bug, Mail, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/admin/apiClient";
import { getAuthState, clearAuthState } from "@/lib/auth";
import { useState, useEffect } from "react";

interface HeaderSettings {
  backgroundType: "color" | "image";
  colorConfig: {
    from: string;
    via: string;
    to: string;
  };
  imageConfig: {
    url: string;
    dataUrl: string;
    repeat: string;
    size: string;
    position: string;
  };
  height: number;
  overlay: {
    enabled: boolean;
    color: string;
  };
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
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
    meta?: {
      resourceType?: string;
      resourceId?: string;
      link?: string;
    };
  };

  const resolveNotificationLink = (n: MessageApi) => {
    const direct = String(n.meta?.link || "").trim();
    if (direct) return direct;

    const resourceTypeRaw = String(n.meta?.resourceType || "").trim();
    const resourceType = resourceTypeRaw.toLowerCase();
    const resourceId = String(n.meta?.resourceId || "").trim();

    if (resourceType === "vehicle") {
      if (resourceId) return `/admin/vehicles?view=${encodeURIComponent(resourceId)}`;
      return "/admin/vehicles";
    }
    if (resourceType === "employee") {
      if (resourceId) return `/admin/employees?view=${encodeURIComponent(resourceId)}`;
      return "/admin/employees";
    }
    if (resourceType === "location") {
      if (resourceId) return `/admin/locations?view=${encodeURIComponent(resourceId)}`;
      return "/admin/locations";
    }
    if (resourceType === "vendor") {
      if (resourceId) return `/admin/vendors?view=${encodeURIComponent(resourceId)}`;
      return "/admin/vendors";
    }
    if (resourceType === "company") {
      if (resourceId) return `/admin/companies?view=${encodeURIComponent(resourceId)}`;
      return "/admin/companies";
    }
    if (resourceType === "onboarding") {
      if (resourceId) return `/admin/onboarding?view=${encodeURIComponent(resourceId)}`;
      return "/admin/onboarding";
    }
    if (resourceType === "time entry" || resourceType === "timeentry" || resourceType === "time_entry") {
      if (resourceId) return `/admin/time-tracking?view=${encodeURIComponent(resourceId)}`;
      return "/admin/time-tracking";
    }
    if (resourceType === "do not hire entry" || resourceType === "donothire" || resourceType === "do_not_hire") {
      if (resourceId) return `/admin/do-not-hire?view=${encodeURIComponent(resourceId)}`;
      return "/admin/do-not-hire";
    }
    if (resourceType === "user") {
      if (resourceId) return `/admin/users?view=${encodeURIComponent(resourceId)}`;
      return "/admin/users";
    }
    if (resourceType === "appliance") {
      if (resourceId) return `/admin/appliances?view=${encodeURIComponent(resourceId)}`;
      return "/admin/appliances";
    }
    if (resourceType === "task") {
      if (resourceId) return `/admin/tasks?view=${encodeURIComponent(resourceId)}`;
      return "/admin/tasks";
    }
    if (resourceType === "bug") {
      if (resourceId) return `/developer/bugs?view=${encodeURIComponent(resourceId)}`;
      return "/developer/bugs";
    }

    const content = String(n.content || "").toLowerCase();
    if (content.includes(" employee")) return "/admin/employees";
    if (content.includes(" vehicle")) return "/admin/vehicles";
    if (content.includes(" location")) return "/admin/locations";
    if (content.includes(" vendor")) return "/admin/vendors";
    if (content.includes(" company")) return "/admin/companies";
    if (content.includes(" onboarding")) return "/admin/onboarding";
    if (content.includes(" do not hire")) return "/admin/do-not-hire";
    if (content.includes(" appliance")) return "/admin/appliances";
    if (content.includes(" task")) return "/admin/tasks";

    return "/admin/notifications";
  };

  const headerSettingsQuery = useQuery<HeaderSettings>({
    queryKey: ["header-settings"],
    queryFn: async () => {
      const res = await apiFetch<{ item: HeaderSettings }>("/api/header-settings");
      return res.item;
    },
  });

  const headerSettings = headerSettingsQuery.data;
  const isImageBackground = headerSettings?.backgroundType === "image";
  const headerHeight = headerSettings?.height || 144;

  // Build background style based on settings
  const getBackgroundStyle = () => {
    if (!headerSettings) {
      // Default gradient
      return { background: "linear-gradient(to right, #133767, #133767, #133767)" };
    }

    if (headerSettings.backgroundType === "image" && headerSettings.imageConfig?.dataUrl) {
      return {
        backgroundImage: `url(${headerSettings.imageConfig.dataUrl})`,
        backgroundRepeat: headerSettings.imageConfig.repeat || "no-repeat",
        backgroundSize: headerSettings.imageConfig.size || "cover",
        backgroundPosition: headerSettings.imageConfig.position || "center",
      };
    }

    // Color gradient
    const { from, via, to } = headerSettings.colorConfig || {};
    return {
      background: `linear-gradient(to right, ${from || "#133767"}, ${via || "#133767"}, ${to || "#133767"})`,
    };
  };

  const bgStyle = getBackgroundStyle();

  // Listen for header settings updates
  useEffect(() => {
    const handleSettingsUpdate = () => {
      void headerSettingsQuery.refetch();
    };
    window.addEventListener("header-settings-updated", handleSettingsUpdate);
    return () => window.removeEventListener("header-settings-updated", handleSettingsUpdate);
  }, [headerSettingsQuery]);

  // Dispatch height change event when header height changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("header-height-changed", { detail: { height: headerHeight } }));
  }, [headerHeight]);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{ item: { fullName?: string; email?: string; avatarUrl?: string } }>("/api/settings");
    },
  });

  // System notifications (broadcasts only)
  const notificationsQuery = useQuery({
    queryKey: ["admin-notifications"],
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
    refetchInterval: 5000, // Refresh every 5 seconds for real-time notifications
  });

  // Direct messages for message dropdown
  const messagesQuery = useQuery({
    queryKey: ["admin-messages-preview"],
    queryFn: async () => {
      const user = getAuthState().username || "admin";
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

  const [reportOpen, setReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportImageFile, setReportImageFile] = useState<File | null>(null);
  const [reportImagePreviewUrl, setReportImagePreviewUrl] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const resetReport = () => {
    setReportTitle("");
    setReportDescription("");
    setReportImageFile(null);
    if (reportImagePreviewUrl) URL.revokeObjectURL(reportImagePreviewUrl);
    setReportImagePreviewUrl("");
    setReportError(null);
  };

  const submitReport = async () => {
    const title = reportTitle.trim();
    const description = reportDescription.trim();
    if (!title || !description) {
      setReportError("Title and description are required");
      return;
    }

    try {
      setReportSubmitting(true);
      setReportError(null);

      const toDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(file);
        });

      const attachment = reportImageFile
        ? {
            fileName: reportImageFile.name,
            url: await toDataUrl(reportImageFile),
            mimeType: reportImageFile.type,
            size: reportImageFile.size,
          }
        : undefined;

      await apiFetch("/api/bugs", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          attachment,
          source: {
            panel: "admin",
            path: typeof window !== "undefined" ? window.location.pathname : "/admin",
          },
        }),
      });

      setReportOpen(false);
      resetReport();
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setReportSubmitting(false);
    }
  };

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
  const fullName = (settings?.fullName || auth.username || "Admin").trim();
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
    <header 
      className="fixed top-0 left-0 right-0 z-30 shadow-floating"
      style={{ 
        height: `${headerHeight}px`,
        left: '0',
      }}
    >
      <div 
        className="w-full h-full relative"
        style={bgStyle}
      >
        {isImageBackground && headerSettings?.overlay?.enabled && (
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: headerSettings.overlay.color }}
          />
        )}
        <div className="hidden md:block fixed top-0 left-0 h-full w-20" style={bgStyle} />
        <div 
          className="relative flex h-full items-center justify-between px-3 sm:px-6 lg:px-10 py-2 md:py-4 animate-fade-in"
        >
          <div className="flex items-center z-10">
            <img
              src="/seven logo.png"
              alt="SE7EN Inc. logo"
              className="h-14 sm:h-16 md:h-36 w-auto max-w-[180px] sm:max-w-[200px] md:max-w-[300px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            />
          </div>

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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex relative h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Report Issue"
              onClick={() => {
                resetReport();
                setReportOpen(true);
              }}
            >
              <Bug className="h-4 w-4" />
            </Button>

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
                  <DropdownMenuItem className="text-xs text-muted-foreground">No notifications</DropdownMenuItem>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start gap-0.5 text-xs"
                      onClick={() => {
                        void markRead(n.id);
                        navigate(resolveNotificationLink(n));
                      }}
                    >
                      <span className="font-medium line-clamp-2">{String(n.content || "")}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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
                      onClick={() => navigate("/admin/messaging", { state: { selectedEmployee: c.employee } })}
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
                      <AvatarFallback className="bg-white/20 text-sm font-semibold">{initials}</AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mr-2">
                <DropdownMenuLabel className="text-xs">
                  {fullName}
                  {email && <span className="block text-[11px] text-muted-foreground">{email}</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs" onClick={() => navigate("/admin/settings")}>
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

            <button
              type="button"
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Open navigation"
              onClick={() => onMenuClick?.()}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) resetReport();
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Report an Issue</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add screenshot and describe the issue. Current page will be attached automatically.
            </DialogDescription>
          </DialogHeader>

          {reportError && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-xs sm:text-sm text-destructive break-words">{reportError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium">Title *</label>
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Button not working"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium">Description *</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm sm:text-base min-h-24 resize-none"
                placeholder="Explain what happened, expected vs actual..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium">Screenshot (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setReportImageFile(file);
                  if (reportImagePreviewUrl) URL.revokeObjectURL(reportImagePreviewUrl);
                  setReportImagePreviewUrl(file ? URL.createObjectURL(file) : "");
                }}
              />
              {reportImagePreviewUrl ? (
                <div className="w-full overflow-hidden rounded-lg border bg-white">
                  <img src={reportImagePreviewUrl} alt="preview" className="w-full h-auto max-h-64 object-contain" />
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              className="w-full sm:w-auto"
              disabled={reportSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitReport()} className="w-full sm:w-auto" disabled={reportSubmitting}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
