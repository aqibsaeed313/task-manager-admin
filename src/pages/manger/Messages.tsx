import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/manger/ui/button";
import { Input } from "@/components/manger/ui/input";
import { Badge } from "@/components/manger/ui/badge";
import { Textarea } from "@/components/manger/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/manger/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/manger/ui/avatar";
import { Card, CardContent } from "@/components/manger/ui/card";
import {
  Plus,
  Search,
  Send,
  ArrowLeft,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/manger/utils";
import { apiFetch } from "@/lib/manger/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Employee {
  id: string;
  _id?: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  department: string;
  status: string;
}

interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  recipient: string;
  content: string;
  timestamp: string;
  type: "direct" | "broadcast";
  status: "sent" | "delivered" | "read";
  createdAt?: string;
}

type MessageApi = Omit<Message, "id"> & {
  _id: string;
};

interface ConversationFromApi {
  employee: Employee;
  lastMessage: Message | null;
  unreadCount: number;
}

interface Conversation {
  employee: Employee;
  lastMessage: Message | null;
  unreadCount: number;
}

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
    createdAt: m.createdAt,
  };
}

function getInitials(name: string): string {
  return String(name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Messages() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "conversation" | "employees">("list");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const currentUser = "Manager"; // Current logged in user

  // Handle navigation state - auto-open conversation from header dropdown
  useEffect(() => {
    const navState = location.state as { selectedEmployee?: Employee } | null;
    if (navState?.selectedEmployee) {
      const emp = navState.selectedEmployee;
      // Small delay to ensure conversations are loaded first
      const timer = setTimeout(() => {
        startConversation(emp);
        // Clear the state so it doesn't reopen on refresh
        window.history.replaceState({}, document.title);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Load employees
  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch<{ items: Employee[] }>("/api/employees");
      return res.items;
    },
  });

  // Load conversations
  const conversationsQuery = useQuery({
    queryKey: ["conversations", currentUser],
    queryFn: async () => {
      const res = await apiFetch<{ items?: ConversationFromApi[] }>(
        `/api/messages/conversations/${encodeURIComponent(currentUser)}`
      );
      return (res.items ?? []).map((c) => ({
        employee: c.employee,
        lastMessage: c.lastMessage,
        unreadCount: c.unreadCount,
      }));
    },
  });

  // Load conversation messages
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);

  const loadConversationMessages = async (employeeName: string) => {
    try {
      const res = await apiFetch<{ items?: MessageApi[] }>(
        `/api/messages/conversation/${encodeURIComponent(currentUser)}/${encodeURIComponent(employeeName)}`
      );
      const msgs = res.items ?? [];
      setConversationMessages(
        msgs
          .map(normalizeMessage)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      );
    } catch (e) {
      console.error("Failed to load conversation messages:", e);
      setConversationMessages([]);
    }
  };

  const markMessagesAsRead = async (sender: string) => {
    try {
      await apiFetch("/api/messages/mark-read", {
        method: "POST",
        body: JSON.stringify({ sender, recipient: currentUser }),
      });
      await queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
    } catch (e) {
      console.error("Failed to mark messages as read:", e);
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    if (view === "conversation" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [view, conversationMessages]);

  const employees = employeesQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.employee.name.toLowerCase().includes(q) ||
        conv.employee.email.toLowerCase().includes(q) ||
        conv.employee.department.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // Filtered employees for selection
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return employees;
    const q = employeeSearchQuery.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
    );
  }, [employees, employeeSearchQuery]);

  const startConversation = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setView("conversation");
    setEmployeeSearchQuery("");
    await loadConversationMessages(employee.name);
    if (employee.name) {
      await markMessagesAsRead(employee.name);
    }
  };

  const sendMessage = async () => {
    if (!newMessageContent.trim() || !selectedEmployee) return;

    setSending(true);
    try {
      const payload: Omit<Message, "id"> = {
        sender: currentUser,
        senderAvatar: getInitials(currentUser),
        recipient: selectedEmployee.name,
        content: newMessageContent.trim(),
        timestamp: new Date().toISOString(),
        type: "direct",
        status: "sent",
      };

      const res = await apiFetch<{ item?: MessageApi }>("/api/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.item) {
        const newMsg = normalizeMessage(res.item);
        setConversationMessages((prev) => [...prev, newMsg]);
        setNewMessageContent("");
        await queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
      }
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Loading state
  if (conversationsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">Messages</h1>
            <p className="page-subtitle">Communicate with your team</p>
          </div>
        </div>
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Empty state
  if (!conversationsQuery.isLoading && conversations.length === 0 && view === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">Messages</h1>
            <p className="page-subtitle">Communicate with your team</p>
          </div>
        </div>

        <div className="h-[calc(100vh-300px)] flex flex-col items-center justify-center px-4">
          <div className="text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">No Messages Yet</h2>
              <p className="text-muted-foreground mt-2 max-w-md">
                Start a conversation with an employee to send and receive messages.
              </p>
            </div>
            <Button size="lg" onClick={() => setView("employees")} className="gap-2">
              <Plus className="h-5 w-5" />
              Start Conversation
            </Button>
          </div>
        </div>

        {/* Employee Selection Dialog */}
        <Dialog open={view === "employees"} onOpenChange={() => setView("list")}>
          <DialogContent className="w-[95vw] max-w-2xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Select Employee</DialogTitle>
            </DialogHeader>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-10"
                value={employeeSearchQuery}
                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredEmployees.map((employee) => (
                <button
                  key={employee.id || employee._id}
                  onClick={() => startConversation(employee)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{employee.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {employee.department || "No Department"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          employee.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        )}
                      >
                        {employee.status}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}

              {filteredEmployees.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No employees found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          {view === "conversation" && selectedEmployee ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setView("list"); setSelectedEmployee(null); }}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{selectedEmployee.name}</h1>
                <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
              </div>
            </div>
          ) : (
            <div className="page-header mb-0">
              <h1 className="page-title">Messages</h1>
              <p className="page-subtitle">
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        {view !== "conversation" && (
          <Button onClick={() => setView("employees")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Conversation
          </Button>
        )}
      </div>

      {/* Conversation List View */}
      {view === "list" && (
        <>
          {/* Search */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Conversations */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.employee.id || conv.employee._id}
                    onClick={() => startConversation(conv.employee)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(conv.employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{conv.employee.name}</p>
                        {conv.lastMessage && (
                          <p className="text-xs text-muted-foreground">
                            {formatMessageTime(conv.lastMessage.timestamp)}
                          </p>
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-sm truncate",
                          conv.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {conv.lastMessage
                          ? `${conv.lastMessage.sender === currentUser ? "You: " : ""}${conv.lastMessage.content}`
                          : "Start a conversation..."}
                      </p>
                    </div>
                  </button>
                ))}

                {filteredConversations.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">No conversations found</p>
                    <Button variant="outline" className="mt-4 gap-2" onClick={() => setView("employees")}>
                      <Plus className="h-4 w-4" />
                      Start New Conversation
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Employee Selection Dialog */}
      <Dialog open={view === "employees"} onOpenChange={() => setView("list")}>
        <DialogContent className="w-[95vw] max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Employee to Message</DialogTitle>
          </DialogHeader>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees by name, email, or department..."
              className="pl-10"
              value={employeeSearchQuery}
              onChange={(e) => setEmployeeSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredEmployees.map((employee) => (
              <button
                key={employee.id || employee._id}
                onClick={() => startConversation(employee)}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{employee.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {employee.department || "No Department"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        employee.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {employee.status}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No employees found</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversation View */}
      {view === "conversation" && selectedEmployee && (
        <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversationMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">Start the conversation</p>
                <p className="text-muted-foreground">Send a message to {selectedEmployee.name}</p>
              </div>
            ) : (
              <>
                {conversationMessages.map((msg, index) => {
                  const isMe = msg.sender === currentUser;
                  const showAvatar = index === 0 || conversationMessages[index - 1].sender !== msg.sender;

                  return (
                    <div key={msg.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                      {showAvatar ? (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className={isMe ? "bg-primary text-primary-foreground" : "bg-muted"}>
                            {getInitials(isMe ? currentUser : msg.sender)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 flex-shrink-0" />
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted rounded-bl-none"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={cn("text-xs mt-1", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {formatMessageTime(msg.timestamp)}
                          {isMe && (
                            <span className="ml-2">
                              {msg.status === "sent" && "✓"}
                              {msg.status === "delivered" && "✓✓"}
                              {msg.status === "read" && "✓✓"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-3">
              <Textarea
                placeholder={`Message ${selectedEmployee.name}...`}
                className="min-h-[60px] resize-none"
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage} disabled={!newMessageContent.trim() || sending} className="h-auto px-4">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
