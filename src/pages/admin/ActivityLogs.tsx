import { useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select";
import { Search, RefreshCw, FileText, User, Clock, Filter, X, Calendar } from "lucide-react";
import { apiFetch, listResource } from "@/lib/admin/apiClient";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  actorUserId: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ActivitySummary {
  totalCount: number;
  actionCounts: { action: string; count: number }[];
  resourceTypeCounts: { resourceType: string; count: number }[];
  topUsers: { username: string; role: string; count: number }[];
}

interface UserItem {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
}

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "Login Success",
  AUTH_LOGIN_FAILURE: "Login Failed",
  AUTH_LOGOUT: "Logout",
  USER_CREATE: "User Added",
  USER_UPDATE: "User Updated",
  USER_DELETE: "User Deleted",
  USER_ROLE_CHANGE: "Role Changed",
  TASK_CREATE: "Task Added",
  TASK_UPDATE: "Task Updated",
  TASK_DELETE: "Task Deleted",
  EMPLOYEE_CREATE: "Employee Added",
  EMPLOYEE_UPDATE: "Employee Updated",
  EMPLOYEE_DELETE: "Employee Deleted",
  TIME_ENTRY_CREATE: "Time Entry Added",
  TIME_ENTRY_UPDATE: "Time Entry Updated",
  TIME_ENTRY_DELETE: "Time Entry Deleted",
  NOTIFICATION_CREATE: "Notification Sent",
  MESSAGE_SEND: "Message Sent",
  SETTINGS_UPDATE: "Settings Updated",
  DATA_EXPORT: "Data Exported",
  APPLIANCE_CREATE: "Appliance Added",
  APPLIANCE_UPDATE: "Appliance Updated",
  APPLIANCE_DELETE: "Appliance Deleted",
  VEHICLE_CREATE: "Vehicle Added",
  VEHICLE_UPDATE: "Vehicle Updated",
  VEHICLE_DELETE: "Vehicle Deleted",
  LOCATION_CREATE: "Location Added",
  LOCATION_UPDATE: "Location Updated",
  LOCATION_DELETE: "Location Deleted",
  VENDOR_CREATE: "Vendor Added",
  VENDOR_UPDATE: "Vendor Updated",
  VENDOR_DELETE: "Vendor Deleted",
  EVENT_CREATE: "Event Added",
  EVENT_UPDATE: "Event Updated",
  EVENT_DELETE: "Event Deleted",
  ONBOARDING_CREATE: "Onboarding Added",
  ONBOARDING_UPDATE: "Onboarding Updated",
  OTHER: "Other Action",
};

const ACTION_COLORS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  AUTH_LOGIN_FAILURE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  AUTH_LOGOUT: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  USER_CREATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  USER_UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  USER_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  USER_ROLE_CHANGE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  TASK_CREATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  TASK_UPDATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  TASK_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  EMPLOYEE_CREATE: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  EMPLOYEE_UPDATE: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  EMPLOYEE_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  TIME_ENTRY_CREATE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  TIME_ENTRY_UPDATE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  TIME_ENTRY_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  NOTIFICATION_CREATE: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  MESSAGE_SEND: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  SETTINGS_UPDATE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  DATA_EXPORT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  APPLIANCE_CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  APPLIANCE_UPDATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  APPLIANCE_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  VEHICLE_CREATE: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  VEHICLE_UPDATE: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  VEHICLE_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  LOCATION_CREATE: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
  LOCATION_UPDATE: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
  LOCATION_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  VENDOR_CREATE: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  VENDOR_UPDATE: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  VENDOR_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  EVENT_CREATE: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  EVENT_UPDATE: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  EVENT_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ONBOARDING_CREATE: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400",
  ONBOARDING_UPDATE: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const RESOURCE_ICONS: Record<string, string> = {
  user: "👤",
  task: "📋",
  employee: "👷",
  "time-entry": "⏰",
  notification: "🔔",
  message: "💬",
  settings: "⚙️",
  auth: "🔐",
  system: "🖥️",
  appliance: "🔌",
  vehicle: "🚗",
  location: "📍",
  vendor: "🏢",
  event: "📅",
  onboarding: "📝",
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);

  const logsRef = useRef<HTMLDivElement | null>(null);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Pagination
  const [limit] = useState(50);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const newSkip = reset ? 0 : skip;
      
      const params = new URLSearchParams();
      params.append("limit", String(limit));
      params.append("skip", String(newSkip));
      if (selectedUserId) params.append("userId", selectedUserId);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (resourceTypeFilter !== "all") params.append("resourceType", resourceTypeFilter);
      if (dateFrom) params.append("from", `${dateFrom}T00:00:00.000Z`);
      if (dateTo) params.append("to", `${dateTo}T23:59:59.999Z`);
      if (searchQuery) params.append("username", searchQuery);
      
      const res = await apiFetch<{ items: ActivityLog[]; pagination: { hasMore: boolean; total: number } }>(
        `/api/activity-logs?${params.toString()}`
      );
      
      if (reset) {
        setLogs(res.items);
        setSkip(limit);
      } else {
        setLogs((prev) => [...prev, ...res.items]);
        setSkip(newSkip + limit);
      }
      
      setHasMore(res.pagination.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await apiFetch<ActivitySummary>("/api/activity-logs/summary");
      setSummary(res);
    } catch (e) {
      console.error("Failed to load summary:", e);
    }
  };

  useEffect(() => {
    fetchLogs(true);
    fetchSummary();
  }, [actionFilter, resourceTypeFilter, dateFrom, dateTo, selectedUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const run = async () => {
      try {
        setUsersLoading(true);
        const items = await listResource<UserItem>("users");
        const normalized = items
          .map((u) => {
            const role = String((u as any).role || "")
              .trim()
              .toLowerCase();
            return {
              ...u,
              role,
            };
          })
          .filter((u) => u.role && u.role !== "super-admin");

        setUsers(normalized);
      } catch (e) {
        console.error("Failed to load users:", e);
      } finally {
        setUsersLoading(false);
      }
    };

    run();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs;
  }, [logs]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatIpAddress = (ip: string | null | undefined) => {
    if (!ip) return "N/A";
    if (ip === "::1" || ip === "::ffff:127.0.0.1") return "127.0.0.1";
    if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
    if (ip.includes(":")) return ip.split(":").pop() || ip;
    return ip;
  };

  const getActionBadgeClass = (action: string) => {
    return ACTION_COLORS[action] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActionFilter("all");
    setResourceTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setSelectedUserId("");
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const admins = useMemo(() => users.filter((u) => String(u.role) === "admin"), [users]);
  const managers = useMemo(() => users.filter((u) => String(u.role) === "manager"), [users]);
  const employees = useMemo(() => users.filter((u) => String(u.role) === "employee"), [users]);

  const selectUser = (id: string) => {
    setSelectedUserId(id);
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");

    window.setTimeout(() => {
      logsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const getRoleLabel = (roleRaw: UserItem["role"]) => {
    const role = String(roleRaw || "").trim().toLowerCase();
    if (role === "admin") return "Admin";
    if (role === "manager") return "Manager";
    if (role === "employee") return "Employee";
    if (role === "super-admin") return "Super Admin";
    return role || "—";
  };

  const activeFilterCount = [
    actionFilter !== "all",
    resourceTypeFilter !== "all",
    dateFrom || dateTo,
    searchQuery,
    selectedUserId
  ].filter(Boolean).length;

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">System Activity Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor all system actions and user activities across the platform.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              fetchLogs(true);
              fetchSummary();
            }}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Summary - Responsive Grid */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="overflow-hidden">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">Total Activities</p>
                    <p className="text-lg md:text-2xl font-bold">{summary.totalCount.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">Most Active</p>
                    <p className="text-sm md:text-lg font-bold truncate">
                      {summary.topUsers[0]?.username || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">Top Action</p>
                    <p className="text-sm md:text-lg font-bold truncate">
                      {summary.actionCounts[0]?.action ? ACTION_LABELS[summary.actionCounts[0].action] : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Filter className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">Resource Types</p>
                    <p className="text-lg md:text-2xl font-bold">{summary.resourceTypeCounts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Activity Section - Scrollable on Mobile */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Users Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {usersLoading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <div className="space-y-6">
                {/* User Categories */}
                <div className="space-y-4">
                  {admins.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">Admins</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {admins.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => selectUser(u.id)}
                            className={cn(
                              "w-full text-left rounded-xl border p-3 md:p-4 transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20",
                              selectedUserId === u.id
                                ? "border-primary bg-primary/5 dark:bg-primary/10"
                                : "bg-card hover:bg-muted/30 dark:hover:bg-muted/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                  selectedUserId === u.id 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-primary/10 text-primary dark:bg-primary/20"
                                )}
                              >
                                <User className="h-4 w-4 md:h-5 md:w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{u.name || u.username}</p>
                                  <Badge variant="secondary" className="capitalize text-xs px-1.5 flex-shrink-0">
                                    {getRoleLabel(u.role)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {managers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">Managers</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {managers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => selectUser(u.id)}
                            className={cn(
                              "w-full text-left rounded-xl border p-3 md:p-4 transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20",
                              selectedUserId === u.id
                                ? "border-primary bg-primary/5 dark:bg-primary/10"
                                : "bg-card hover:bg-muted/30 dark:hover:bg-muted/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                  selectedUserId === u.id 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-primary/10 text-primary dark:bg-primary/20"
                                )}
                              >
                                <User className="h-4 w-4 md:h-5 md:w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{u.name || u.username}</p>
                                  <Badge variant="secondary" className="capitalize text-xs px-1.5 flex-shrink-0">
                                    {getRoleLabel(u.role)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {employees.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">Employees</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {employees.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => selectUser(u.id)}
                            className={cn(
                              "w-full text-left rounded-xl border p-3 md:p-4 transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20",
                              selectedUserId === u.id
                                ? "border-primary bg-primary/5 dark:bg-primary/10"
                                : "bg-card hover:bg-muted/30 dark:hover:bg-muted/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                  selectedUserId === u.id 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-primary/10 text-primary dark:bg-primary/20"
                                )}
                              >
                                <User className="h-4 w-4 md:h-5 md:w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{u.name || u.username}</p>
                                  <Badge variant="secondary" className="capitalize text-xs px-1.5 flex-shrink-0">
                                    {getRoleLabel(u.role)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Responsive */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom(todayIso);
                      setDateTo(todayIso);
                      fetchLogs(true);
                    }}
                    disabled={!selectedUserId}
                    className="flex-1 sm:flex-none"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      fetchLogs(true);
                    }}
                    disabled={!selectedUserId}
                    className="flex-1 sm:flex-none"
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUserId("");
                      setDateFrom("");
                      setDateTo("");
                      fetchLogs(true);
                    }}
                    className="flex-1 sm:flex-none"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters Section - Mobile Toggle */}
        <Card>
          <CardContent className="p-4">
            {/* Mobile Filter Toggle */}
            <div className="flex lg:hidden items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filters - Desktop always visible, Mobile toggleable */}
            <div className={cn(
              "space-y-4",
              !showMobileFilters && "hidden lg:block"
            )}>
              {/* Search and Main Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={!!selectedUserId}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {Object.entries(ACTION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Resource type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Resources</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="employee">Employees</SelectItem>
                      <SelectItem value="time-entry">Time Entries</SelectItem>
                      <SelectItem value="notification">Notifications</SelectItem>
                      <SelectItem value="message">Messages</SelectItem>
                      <SelectItem value="settings">Settings</SelectItem>
                      <SelectItem value="auth">Authentication</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Date Range */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Activity Logs Table */}
        <div ref={logsRef} />
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base md:text-lg">Activity Log ({logs.length} shown)</CardTitle>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="w-fit">
                  {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile Card View */}
            <div className="block lg:hidden">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 border-b hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{log.actorUsername}</p>
                        <p className="text-xs text-muted-foreground capitalize">{log.actorRole}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-xs whitespace-nowrap", getActionBadgeClass(log.action))}>
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </div>
                  
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg flex-shrink-0">{RESOURCE_ICONS[log.resourceType] || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm capitalize">{log.resourceType.replace(/-/g, " ")}</p>
                      {log.resourceName && (
                        <p className="text-xs text-muted-foreground truncate">{log.resourceName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatDate(log.createdAt)}</span>
                    <code className="bg-muted px-2 py-1 rounded">{formatIpAddress(log.ipAddress)}</code>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px] whitespace-nowrap">Time</TableHead>
                    <TableHead className="w-[120px]">User</TableHead>
                    <TableHead className="w-[130px]">Action</TableHead>
                    <TableHead className="min-w-[180px]">Resource</TableHead>
                    <TableHead className="w-[100px] text-right">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[100px]">{log.actorUsername}</p>
                            <p className="text-xs text-muted-foreground capitalize">{log.actorRole}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("whitespace-nowrap", getActionBadgeClass(log.action))}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg flex-shrink-0">{RESOURCE_ICONS[log.resourceType] || "📄"}</span>
                          <div className="min-w-0">
                            <p className="text-sm capitalize">{log.resourceType.replace(/-/g, " ")}</p>
                            {log.resourceName && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {log.resourceName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <code className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap">{formatIpAddress(log.ipAddress)}</code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Empty State */}
            {!loading && logs.length === 0 && (
              <div className="text-center py-12 px-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No activity logs found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or wait for new activities
                </p>
              </div>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t text-center">
                <Button
                  variant="outline"
                  onClick={() => fetchLogs(false)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {loading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}