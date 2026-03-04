import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import { Plus, Search, Bell, MessageSquare, Send } from "lucide-react";
import { apiFetch, createResource, listResource } from "@/lib/admin/apiClient";
import { Textarea } from "@/components/admin/ui/textarea";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  audience: "all" | "employees" | "managers";
  createdAt: string;
}

const CHAT_SETTINGS_KEY = "taskflow_chat_settings";

type ChatSettings = {
  chatEnabled: boolean;
};

interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  recipient: string;
  content: string;
  timestamp: string;
  type: "direct" | "broadcast";
  status: "sent" | "delivered" | "read";
}

type MessageApi = Omit<Message, "id"> & {
  _id: string;
};

function normalizeMessage(m: MessageApi): Message {
  return {
    id: m._id,
    sender: m.sender,
    senderAvatar: m.senderAvatar,
    recipient: m.recipient,
    content: m.content,
    timestamp: m.timestamp,
    type: m.type,
    status: m.status,
  };
}

function loadChatSettings(): ChatSettings {
  const saved = localStorage.getItem(CHAT_SETTINGS_KEY);
  if (!saved) return { chatEnabled: true };
  try {
    const parsed = JSON.parse(saved) as Partial<ChatSettings>;
    return {
      chatEnabled: parsed.chatEnabled ?? true,
    };
  } catch {
    return { chatEnabled: true };
  }
}

const seedNotifications: NotificationItem[] = [
  {
    id: "NTF-001",
    title: "System Maintenance",
    message: "Scheduled maintenance tonight at 11:00 PM.",
    audience: "all",
    createdAt: "2026-02-03",
  },
];

export default function Messaging() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"messages" | "notifications">("messages");
  const [chatSettings, setChatSettings] = useState<ChatSettings>(() => loadChatSettings());

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [items, setItems] = useState<NotificationItem[]>(() => []);
  const [messages, setMessages] = useState<Message[]>(() => []);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    audience: "all" as NotificationItem["audience"],
  });

  const [messageFormData, setMessageFormData] = useState({
    type: "direct" as Message["type"],
    recipient: "",
    content: "",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        const notificationsList = await listResource<NotificationItem>("notifications");
        if (!mounted) return;

        setItems(notificationsList);

        // Only load messages when Messages tab is active
        if (activeTab === "messages") {
          const messagesRes = await apiFetch<{ items?: MessageApi[] } | MessageApi[]>("/api/messages");
          if (!mounted) return;
          const rawMessages = Array.isArray(messagesRes) ? messagesRes : (messagesRes.items ?? []);
          setMessages(rawMessages.map(normalizeMessage));
        }
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load messaging data");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const refresh = async () => {
    if (activeTab === "messages") {
      const [notificationsList, messagesRes] = await Promise.all([
        listResource<NotificationItem>("notifications"),
        apiFetch<{ items?: MessageApi[] } | MessageApi[]>("/api/messages"),
      ]);
      setItems(notificationsList);
      const rawMessages = Array.isArray(messagesRes) ? messagesRes : (messagesRes.items ?? []);
      setMessages(rawMessages.map(normalizeMessage));
      return;
    }

    const notificationsList = await listResource<NotificationItem>("notifications");
    setItems(notificationsList);
  };

  useEffect(() => {
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(chatSettings));
  }, [chatSettings]);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => {
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.audience.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      return m.recipient.toLowerCase().includes(q) || m.content.toLowerCase().includes(q);
    });
  }, [messages, searchQuery]);

  const addNotification = async () => {
    if (!formData.title || !formData.message) return;
    const next: NotificationItem = {
      id: `NTF-${Date.now().toString().slice(-6)}`,
      title: formData.title,
      message: formData.message,
      audience: formData.audience,
      createdAt: new Date().toISOString().split("T")[0],
    };
    try {
      setApiError(null);
      await createResource<NotificationItem>("notifications", next);
      await refresh();
      setAddOpen(false);
      setFormData({ title: "", message: "", audience: "all" });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to send notification");
    }
  };

  const addMessage = async () => {
    if (!messageFormData.content.trim()) return;
    if (messageFormData.type === "direct" && !messageFormData.recipient.trim()) return;

    const payload: Omit<Message, "id"> = {
      sender: "You",
      senderAvatar: "AD",
      recipient: messageFormData.type === "broadcast" ? "All Employees" : messageFormData.recipient.trim(),
      content: messageFormData.content,
      timestamp: "Just now",
      type: messageFormData.type,
      status: "sent",
    };

    try {
      setApiError(null);
      const res = await apiFetch<{ item?: MessageApi }>("/api/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.item) {
        setMessages((prev) => [normalizeMessage(res.item), ...prev]);
      } else {
        await refresh();
      }

      setNewMessageOpen(false);
      setMessageFormData({ type: "direct", recipient: "", content: "" });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to send message");
    }
  };

  return (
    <AdminLayout>
      {/* Mobile-first container */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        
        {/* Page Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Messaging & Notifications
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Send system-wide notifications and track logs.
            </p>
          </div>

          {/* New Notification Dialog */}
          {activeTab === "notifications" ? (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="sm:hidden">New</span>
                  <span className="hidden sm:inline">New Notification</span>
                </Button>
              </DialogTrigger>
            
            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">New Notification</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create and send a notification
                </DialogDescription>
              </DialogHeader>
              
              <form className="space-y-4 sm:space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Title *</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    placeholder="Overdue task reminder"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Message *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base min-h-[80px] sm:min-h-24 resize-none"
                    placeholder="Write message..."
                    required
                  />
                </div>

                {/* Audience */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Audience</label>
                    <select
                      value={formData.audience}
                      onChange={(e) =>
                        setFormData({ ...formData, audience: e.target.value as NotificationItem["audience"] })
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                    >
                      <option value="all">All</option>
                      <option value="employees">Employees</option>
                      <option value="managers">Managers</option>
                    </select>
                  </div>
                </div>
              </form>
              
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setAddOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={addNotification} 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                >
                  <Bell className="h-4 w-4 mr-2 flex-shrink-0" />
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="sm:hidden">New</span>
                  <span className="hidden sm:inline">New Message</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-1.5 sm:space-y-2">
                  <DialogTitle className="text-lg sm:text-xl">New Message</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Send a message to a person or broadcast to all employees.
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Type</label>
                      <select
                        value={messageFormData.type}
                        onChange={(e) =>
                          setMessageFormData((p) => ({
                            ...p,
                            type: e.target.value as Message["type"],
                            recipient: e.target.value === "broadcast" ? "" : p.recipient,
                          }))
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                      >
                        <option value="direct">Direct</option>
                        <option value="broadcast">Broadcast</option>
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">To</label>
                      <Input
                        placeholder={messageFormData.type === "broadcast" ? "All Employees" : "Recipient name"}
                        value={messageFormData.recipient}
                        onChange={(e) => setMessageFormData((p) => ({ ...p, recipient: e.target.value }))}
                        disabled={messageFormData.type === "broadcast"}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Message</label>
                      <Textarea
                        className="min-h-[140px]"
                        placeholder="Type your message..."
                        value={messageFormData.content}
                        onChange={(e) => setMessageFormData((p) => ({ ...p, content: e.target.value }))}
                      />
                    </div>
                  </div>
                </form>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setNewMessageOpen(false)}
                    className="w-full sm:w-auto order-2 sm:order-1"
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addMessage}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                    type="button"
                  >
                    <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                    Send
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* API Error Message */}
        {apiError && (
          <div className="rounded-md bg-destructive/10 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-destructive break-words">
              {apiError}
            </p>
          </div>
        )}

        

        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("messages")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === "messages"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            type="button"
          >
            <MessageSquare className="w-4 h-4" />
            Messages
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === "notifications"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            type="button"
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
        </div>

        {/* Search Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardContent className="p-3 sm:p-6">
            <div className="relative w-full sm:max-w-md">
              <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                {activeTab === "messages" ? "Search Messages" : "Search Notifications"}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder={activeTab === "messages" ? "Search messages..." : "Search notifications..."}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Log Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              {activeTab === "messages"
                ? `Messages (${filteredMessages.length})`
                : `Notification Log (${filteredNotifications.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading...
                </div>
              </div>
            ) : (
              <>
                {activeTab === "messages" ? (
                  <div className="divide-y divide-border">
                    {filteredMessages.length === 0 ? (
                      <div className="p-6 text-sm text-muted-foreground">No messages found.</div>
                    ) : (
                      filteredMessages.map((message) => (
                        <div key={message.id} className="px-6 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                                  {message.senderAvatar}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">To: {message.recipient}</p>
                                  <p className="text-sm text-muted-foreground truncate">{message.content}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">{message.timestamp}</p>
                              <div className="flex items-center justify-end gap-2 mt-1">
                                <Badge variant="outline" className="capitalize">
                                  {message.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{message.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mobile View - Cards */}
                    <div className="block sm:hidden space-y-3 p-4">
                      {filteredNotifications.map((n) => (
                        <div key={n.id} className="bg-white rounded-lg border p-4 space-y-3">
                          {/* Header with Icon and Title */}
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <Bell className="h-4 w-4 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground">{n.id}</p>
                            </div>
                          </div>

                          {/* Message */}
                          <div className="pl-11">
                            <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                          </div>

                          {/* Footer - Audience and Date */}
                          <div className="flex items-center justify-between pt-1 border-t">
                            <Badge variant="secondary" className="text-xs">
                              {n.audience}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{n.createdAt}</span>
                          </div>
                        </div>
                      ))}

                      {filteredNotifications.length === 0 && (
                        <div className="text-center py-8">
                          <div className="flex justify-center mb-3">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <Bell className="h-6 w-6 text-muted-foreground" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">No notifications found</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Try adjusting your search or send a new notification
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tablet/Desktop View - Table */}
                    <div className="hidden sm:block w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs md:text-sm w-[50%]">Notification</TableHead>
                            <TableHead className="text-xs md:text-sm w-[20%]">Audience</TableHead>
                            <TableHead className="text-xs md:text-sm w-[15%]">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredNotifications.map((n) => (
                            <TableRow key={n.id} className="hover:bg-muted/30">
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-sm md:text-base">{n.title}</p>
                                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 max-w-2xl">
                                    {n.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground md:hidden">{n.id}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs md:text-sm">
                                  {n.audience}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm md:text-base text-muted-foreground">{n.createdAt}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}