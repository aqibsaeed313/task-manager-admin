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
import { Search, RefreshCw, FileText, User, Clock, Filter } from "lucide-react";
import { apiFetch, listResource } from "@/lib/admin/apiClient";

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
  USER_CREATE: "User Created",
  USER_UPDATE: "User Updated",
  USER_DELETE: "User Deleted",
  USER_ROLE_CHANGE: "Role Changed",
  TASK_CREATE: "Task Created",
  TASK_UPDATE: "Task Updated",
  TASK_DELETE: "Task Deleted",
  EMPLOYEE_CREATE: "Employee Created",
  EMPLOYEE_UPDATE: "Employee Updated",
  EMPLOYEE_DELETE: "Employee Deleted",
  TIME_ENTRY_CREATE: "Time Entry Created",
  TIME_ENTRY_UPDATE: "Time Entry Updated",
  TIME_ENTRY_DELETE: "Time Entry Deleted",
  NOTIFICATION_CREATE: "Notification Sent",
  MESSAGE_SEND: "Message Sent",
  SETTINGS_UPDATE: "Settings Updated",
  DATA_EXPORT: "Data Exported",
  OTHER: "Other Action",
};

const ACTION_COLORS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "bg-green-100 text-green-800",
  AUTH_LOGIN_FAILURE: "bg-red-100 text-red-800",
  AUTH_LOGOUT: "bg-gray-100 text-gray-800",
  USER_CREATE: "bg-blue-100 text-blue-800",
  USER_UPDATE: "bg-blue-100 text-blue-800",
  USER_DELETE: "bg-red-100 text-red-800",
  USER_ROLE_CHANGE: "bg-purple-100 text-purple-800",
  TASK_CREATE: "bg-yellow-100 text-yellow-800",
  TASK_UPDATE: "bg-yellow-100 text-yellow-800",
  TASK_DELETE: "bg-red-100 text-red-800",
  EMPLOYEE_CREATE: "bg-indigo-100 text-indigo-800",
  EMPLOYEE_UPDATE: "bg-indigo-100 text-indigo-800",
  EMPLOYEE_DELETE: "bg-red-100 text-red-800",
  TIME_ENTRY_CREATE: "bg-cyan-100 text-cyan-800",
  TIME_ENTRY_UPDATE: "bg-cyan-100 text-cyan-800",
  TIME_ENTRY_DELETE: "bg-red-100 text-red-800",
  NOTIFICATION_CREATE: "bg-pink-100 text-pink-800",
  MESSAGE_SEND: "bg-teal-100 text-teal-800",
  SETTINGS_UPDATE: "bg-orange-100 text-orange-800",
  DATA_EXPORT: "bg-amber-100 text-amber-800",
  OTHER: "bg-gray-100 text-gray-800",
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
      
      // Build query params
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

  // Debounced search
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadgeClass = (action: string) => {
    return ACTION_COLORS[action] || "bg-gray-100 text-gray-800";
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

    // Smooth scroll down to the logs section
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Activity Logs</h1>
            <p className="text-muted-foreground mt-1">
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
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Summary */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Activities</p>
                    <p className="text-2xl font-bold">{summary.totalCount.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Most Active User</p>
                    <p className="text-lg font-bold truncate">
                      {summary.topUsers[0]?.username || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Action</p>
                    <p className="text-lg font-bold truncate">
                      {summary.actionCounts[0]?.action ? ACTION_LABELS[summary.actionCounts[0].action] : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Filter className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resource Types</p>
                    <p className="text-2xl font-bold">{summary.resourceTypeCounts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Users Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {usersLoading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">Admins</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {admins.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => selectUser(u.id)}
                        className={
                          "w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 " +
                          (selectedUserId === u.id
                            ? "border-primary bg-primary/5"
                            : "bg-card hover:bg-muted/30")
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={
                              "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 " +
                              (selectedUserId === u.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")
                            }
                          >
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{u.name || u.username}</p>
                              <Badge variant="secondary" className="capitalize">
                                {getRoleLabel(u.role)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {admins.length === 0 && <p className="text-sm text-muted-foreground">No admins found</p>}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Managers</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {managers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => selectUser(u.id)}
                        className={
                          "w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 " +
                          (selectedUserId === u.id
                            ? "border-primary bg-primary/5"
                            : "bg-card hover:bg-muted/30")
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={
                              "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 " +
                              (selectedUserId === u.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")
                            }
                          >
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{u.name || u.username}</p>
                              <Badge variant="secondary" className="capitalize">
                                {getRoleLabel(u.role)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {managers.length === 0 && <p className="text-sm text-muted-foreground">No managers found</p>}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Employees</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employees.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => selectUser(u.id)}
                        className={
                          "w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 " +
                          (selectedUserId === u.id
                            ? "border-primary bg-primary/5"
                            : "bg-card hover:bg-muted/30")
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={
                              "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 " +
                              (selectedUserId === u.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")
                            }
                          >
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{u.name || u.username}</p>
                              <Badge variant="secondary" className="capitalize">
                                {getRoleLabel(u.role)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {employees.length === 0 && <p className="text-sm text-muted-foreground">No employees found</p>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateFrom(todayIso);
                      setDateTo(todayIso);
                      fetchLogs(true);
                    }}
                    disabled={!selectedUserId}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      fetchLogs(true);
                    }}
                    disabled={!selectedUserId}
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedUserId("");
                      setDateFrom("");
                      setDateTo("");
                      fetchLogs(true);
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
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

              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[200px]">
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
                  <SelectTrigger className="w-[180px]">
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

                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-auto"
                />
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
          <CardHeader>
            <CardTitle>Activity Log ({logs.length} shown)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Time</TableHead>
                    <TableHead className="w-[150px]">User</TableHead>
                    <TableHead className="w-[180px]">Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="w-[120px]">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{log.actorUsername}</p>
                            <p className="text-xs text-muted-foreground capitalize">{log.actorRole}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeClass(log.action)}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{RESOURCE_ICONS[log.resourceType] || "📄"}</span>
                          <div>
                            <p className="text-sm capitalize">{log.resourceType.replace(/-/g, " ")}</p>
                            {log.resourceName && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {log.resourceName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{log.ipAddress || "N/A"}</code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Empty State */}
            {!loading && logs.length === 0 && (
              <div className="text-center py-12">
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
