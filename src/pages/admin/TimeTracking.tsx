import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/admin/ui/avatar";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter, 
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { Clock, MapPin, MoreHorizontal, Plus, Calendar, Users, ShieldAlert, FileText, Printer, Search } from "lucide-react";

import { apiFetch, createResource, deleteResource, getApiBaseUrl, listResource, updateResource } from "@/lib/admin/apiClient";
import { getAuthState } from "@/lib/auth";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

interface TimeEntry {
  id: string;
  employee: string;
  initials: string;
  avatar?: string;
  location: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: "clocked-in" | "clocked-out" | "on-break";
}

type TimeEntryApi = {
  id?: string;
  _id?: string;
  employee?: string;
  avatar?: string;
  location?: string;
  date?: string;
  clockIn?: string;
  clockOut?: string | null;
  status?: string;
  initials?: string;
};

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: "active" | "inactive" | "on-leave";
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  status: "active" | "inactive" | "pending";
}

type ComplianceFlag = {
  id: string;
  employee: string;
  type: "meal_break" | "overtime" | "off_the_clock" | "hard_stop";
  severity: "warning" | "violation";
  status: "open" | "resolved";
  message: string;
  detectedAt: string;
  timeEntryId?: string;
};

type OvertimeTracker = {
  id: string;
  employee: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeRate: number;
};

type TimeEditAuditLog = {
  id: string;
  timeEntryId: string;
  field: string;
  originalValue: unknown;
  modifiedValue: unknown;
  editedByUserId: string;
  ipAddress: string;
  createdAt: string;
};

const statusClasses = {
  "clocked-in": "bg-success/10 text-success",
  "clocked-out": "bg-muted text-muted-foreground",
  "on-break": "bg-warning/10 text-warning",
};

const statusLabels = {
  "clocked-in": "Clocked In",
  "clocked-out": "Clocked Out",
  "on-break": "On Break",
};

function getInitials(name: string) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function parseMinutes(hhmm: string) {
  const [h, m] = String(hhmm || "")
    .split(":")
    .map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatDuration(totalMinutes: number) {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function calcEntryMinutes(entry: TimeEntry) {
  const inMin = parseMinutes(entry.clockIn);
  if (inMin === null) return 0;
  const outMin = entry.clockOut ? parseMinutes(entry.clockOut) : null;
  if (outMin === null) return 0;
  const diff = outMin - inMin;
  return diff > 0 ? diff : 0;
}

function formatEntryDate(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (m) return m[0];
  const d = new Date(raw);
  if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  return raw;
}

function normalizeTimeEntry(e: TimeEntryApi): TimeEntry {
  const employee = String(e.employee || "").trim();
  const id = String((e as any).id || e._id || "");
  const location = String(e.location || "");
  const date = String(e.date || "");
  const clockIn = String(e.clockIn || "");
  const clockOut = (e.clockOut === null ? null : String(e.clockOut || "")) || null;
  const statusRaw = String(e.status || "");
  const status: TimeEntry["status"] =
    statusRaw === "clocked-in" || statusRaw === "on-break" || statusRaw === "clocked-out"
      ? (statusRaw as TimeEntry["status"])
      : clockOut
        ? "clocked-out"
        : "clocked-in";

  const initials = String((e as any).initials || "").trim() || getInitials(employee);
  const avatar = String(e.avatar || "").trim();

  return {
    id,
    employee,
    initials,
    avatar: avatar || undefined,
    location,
    date,
    clockIn,
    clockOut,
    status,
  };
}

const TimeTracking = () => {
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);

  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [complianceFlags, setComplianceFlags] = useState<ComplianceFlag[]>([]);
  const [overtimeTrackers, setOvertimeTrackers] = useState<OvertimeTracker[]>([]);
  const [auditLogs, setAuditLogs] = useState<TimeEditAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    employee: "",
    location: "",
    date: new Date().toISOString().split("T")[0],
    clockIn: "",
    clockOut: "",
    status: "clocked-in" as TimeEntry["status"],
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        
        // Fetch time entries
        const list = await listResource<TimeEntryApi>("time-entries");
        if (!mounted) return;
        setEntries(list.map(normalizeTimeEntry));
        
        // Fetch employees from employees API
        let allEmployees: Employee[] = [];
        try {
          const employeeList = await listResource<Employee>("employees");
          if (mounted) {
            allEmployees = employeeList.filter((e) => e.status === "active");
          }
        } catch (empErr) {
          console.error("Failed to load employees:", empErr);
        }
        
        // Fetch users with employee role from users API
        try {
          const userList = await listResource<User>("users");
          if (mounted) {
            const employeeUsers = userList
              .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
              .map((u) => ({
                id: u.id,
                name: u.name,
                initials: getInitials(u.name),
                email: u.email,
                status: "active" as const,
              }));
            
            // Merge both lists (remove duplicates by email)
            employeeUsers.forEach((eu) => {
              if (!allEmployees.some((e) => e.email === eu.email)) {
                allEmployees.push(eu);
              }
            });
          }
        } catch (userErr) {
          console.error("Failed to load users:", userErr);
        }
        
        if (mounted) {
          setEmployees(allEmployees);
        }
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load time entries");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const refresh = async () => {
    const list = await listResource<TimeEntryApi>("time-entries");
    setEntries(list.map(normalizeTimeEntry));
  };

  const loadCompliance = async () => {
    try {
      setComplianceLoading(true);
      setComplianceError(null);

      const flagsRes = await apiFetch<{ items: ComplianceFlag[] }>("/api/compliance/flags?status=open");
      const overtimeRes = await apiFetch<{ items: OvertimeTracker[] }>("/api/compliance/overtime");
      const auditRes = await apiFetch<{ items: TimeEditAuditLog[] }>("/api/compliance/audit-logs");

      setComplianceFlags(flagsRes.items || []);
      setOvertimeTrackers(overtimeRes.items || []);
      setAuditLogs(auditRes.items || []);
    } catch (e) {
      setComplianceError(e instanceof Error ? e.message : "Failed to load compliance data");
    } finally {
      setComplianceLoading(false);
    }
  };

  const exportComplianceCsv = async () => {
    const auth = getAuthState();
    const token = auth.token;
    if (!token) {
      alert("Not authenticated");
      return;
    }

    try {
      const res = await fetch(`${String(getApiBaseUrl()).replace(/\/$/, "")}/api/compliance/export.csv`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compliance_report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to export CSV");
    }
  };

  const exportCompliancePdf = async () => {
    try {
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const margin = 36;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (needed: number) => {
        if (y + needed <= pageHeight - margin) return;
        doc.addPage();
        y = margin;
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Compliance Report", margin, y);
      y += 22;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 18;

      doc.setFont("helvetica", "bold");
      doc.text("Open Flags", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");

      for (const f of complianceFlags) {
        ensureSpace(46);
        const head = `${f.employee} | ${f.type} | ${f.severity}`;
        const body = f.message || "";
        const headLines = doc.splitTextToSize(head, maxWidth);
        const bodyLines = doc.splitTextToSize(body, maxWidth);
        doc.text(headLines, margin, y);
        y += headLines.length * 14;
        doc.text(bodyLines, margin, y);
        y += bodyLines.length * 14 + 8;
      }

      doc.save("compliance_report.pdf");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to export PDF");
    }
  };

  const tryPayrollExport = async () => {
    try {
      await apiFetch<{ ok: true }>("/api/compliance/payroll/export", { method: "POST" });
      alert("Payroll export allowed (no unresolved violations)");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Payroll export blocked");
    }
  };

  const sortedEntries = useMemo(() => {
    return entries
      .slice()
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        if (a.clockIn !== b.clockIn) return a.clockIn < b.clockIn ? 1 : -1;
        return a.id < b.id ? 1 : -1;
      });
  }, [entries]);

  const summary = useMemo(() => {
    const clockedIn = sortedEntries.filter((e) => e.status === "clocked-in").length;
    const onBreak = sortedEntries.filter((e) => e.status === "on-break").length;
    const clockedOut = sortedEntries.filter((e) => e.status === "clocked-out").length;
    const totalMinutes = sortedEntries.reduce((acc, e) => acc + calcEntryMinutes(e), 0);
    return {
      clockedIn,
      onBreak,
      clockedOut,
      totalMinutes,
    };
  }, [sortedEntries]);

  const reports = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const e of sortedEntries) {
      const mins = calcEntryMinutes(e);
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + mins);
    }

    const daily = Array.from(byDay.entries())
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const weeklyTotalMinutes = daily.reduce((acc, d) => acc + d.minutes, 0);
    return {
      daily,
      weeklyTotalMinutes,
    };
  }, [sortedEntries]);

  const addEntry = async () => {
    if (!formData.employee || !formData.location || !formData.date || !formData.clockIn) return;

    const entry: TimeEntry = {
      id: `TIME-${Date.now().toString().slice(-6)}`,
      employee: formData.employee,
      initials: getInitials(formData.employee),
      location: formData.location,
      date: formData.date,
      clockIn: formData.clockIn,
      clockOut: formData.clockOut || null,
      status: formData.clockOut ? "clocked-out" : formData.status,
    };

    try {
      setApiError(null);
      await createResource<TimeEntry>("time-entries", entry);
      await refresh();
      setAddOpen(false);
      setFormData({
        employee: "",
        location: "",
        date: new Date().toISOString().split("T")[0],
        clockIn: "",
        clockOut: "",
        status: "clocked-in",
      });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to add entry");
    }
  };

  const removeEntry = async (id: string) => {
    try {
      setApiError(null);
      await deleteResource("time-entries", id);
      await refresh();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to remove entry");
    }
  };

  const clockOutNow = async (id: string) => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const out = `${hh}:${mm}`;

    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    try {
      setApiError(null);
      await updateResource<TimeEntry>("time-entries", id, {
        ...entry,
        clockOut: out,
        status: "clocked-out",
      });
      await refresh();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to clock out");
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
              Time Tracking
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Monitor employee clock-in/out and work hours.
            </p>
          </div>

          {/* Add Entry Dialog */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add Entry</span>
              </Button>
            </DialogTrigger>
            
            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Add Time Entry</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a clock-in/out entry for an employee
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4 sm:space-y-5">
                {/* Employee & Location */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Employee *</label>
                    <select
                      value={formData.employee}
                      onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                      required
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    {employees.length === 0 && (
                      <p className="text-xs text-warning mt-1">No employees found.</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Location *</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Building A"
                      required
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Date, Clock In, Clock Out */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Date *</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Clock In *</label>
                    <Input
                      type="time"
                      value={formData.clockIn}
                      onChange={(e) => setFormData({ ...formData, clockIn: e.target.value })}
                      required
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Clock Out</label>
                    <Input
                      type="time"
                      value={formData.clockOut}
                      onChange={(e) => setFormData({ ...formData, clockOut: e.target.value })}
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as TimeEntry["status"] })
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                      disabled={Boolean(formData.clockOut)}
                    >
                      <option value="clocked-in">Clocked In</option>
                      <option value="on-break">On Break</option>
                      <option value="clocked-out">Clocked Out</option>
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
                  onClick={addEntry} 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Save Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* API Error Message */}
        {apiError && (
          <div className="rounded-md bg-destructive/10 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-destructive break-words">
              {apiError}
            </p>
          </div>
        )}

        {/* Compliance Dashboard */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-warning" />
                Compliance Dashboard
              </span>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadCompliance()}>
                  <Search className="h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void exportComplianceCsv()}>
                  <FileText className="h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void exportCompliancePdf()}>
                  <Printer className="h-4 w-4" />
                  PDF
                </Button>
                <Button size="sm" className="gap-2" onClick={() => void tryPayrollExport()}>
                  Payroll Export
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6 pb-5 sm:pb-6">
            {complianceLoading ? (
              <p className="text-xs sm:text-sm text-muted-foreground">Loading compliance data...</p>
            ) : complianceError ? (
              <p className="text-xs sm:text-sm text-destructive break-words">{complianceError}</p>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-lg border p-3 sm:p-4 bg-muted/10">
                <p className="text-sm font-semibold">Active Violations</p>
                <p className="text-xs text-muted-foreground mt-1">Open flags</p>
                <div className="mt-3 space-y-2">
                  {complianceFlags.slice(0, 6).map((f) => (
                    <div key={f.id} className="rounded-md border p-2 bg-background">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-medium truncate">{f.employee}</p>
                        <Badge
                          variant="secondary"
                          className={
                            f.severity === "violation"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }
                        >
                          {f.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{f.type}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.message}</p>
                    </div>
                  ))}
                  {!complianceFlags.length ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No open flags</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border p-3 sm:p-4 bg-muted/10">
                <p className="text-sm font-semibold">Overtime Risk</p>
                <p className="text-xs text-muted-foreground mt-1">Weekly totals</p>
                <div className="mt-3 space-y-2">
                  {overtimeTrackers.slice(0, 6).map((o) => (
                    <div key={o.id} className="rounded-md border p-2 bg-background">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-medium truncate">{o.employee}</p>
                        <Badge
                          variant="secondary"
                          className={o.overtimeHours > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}
                        >
                          {o.overtimeHours > 0 ? "OT" : "OK"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {o.weekStart} - {o.weekEnd}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total {Number(o.totalHours || 0).toFixed(2)}h | OT {Number(o.overtimeHours || 0).toFixed(2)}h
                      </p>
                    </div>
                  ))}
                  {!overtimeTrackers.length ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No overtime records</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border p-3 sm:p-4 bg-muted/10">
                <p className="text-sm font-semibold">Audit Logs</p>
                <p className="text-xs text-muted-foreground mt-1">Immutable time edits</p>
                <div className="mt-3 space-y-2">
                  {auditLogs.slice(0, 6).map((a) => (
                    <div key={a.id} className="rounded-md border p-2 bg-background">
                      <p className="text-xs sm:text-sm font-medium truncate">{a.field}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">Entry: {a.timeEntryId}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">By: {a.editedByUserId}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">IP: {a.ipAddress}</p>
                    </div>
                  ))}
                  {!auditLogs.length ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No audit logs</p>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily / Weekly Reports Card - Responsive */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Daily / Weekly Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-5 sm:pb-6">
     
            <div className="rounded-md border p-3 sm:p-4 bg-muted/10">
              <p className="text-xs sm:text-sm text-black">Weekly Total</p>
              <p className="text-xl sm:text-2xl font-bold text-black">
                {formatDuration(reports.weeklyTotalMinutes)}
              </p>
            </div>
            
      
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Daily Breakdown</p>
              {reports.daily.length === 0 ? (
                <div className="text-center py-4 sm:py-6">
                  <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground">No daily totals for selected filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {reports.daily.slice(0, 7).map((d) => (
                    <div key={d.date} className="flex items-center justify-between rounded-md border p-2 sm:p-3 hover:bg-muted/30">
                      <p className="text-xs sm:text-sm font-medium">{formatEntryDate(d.date)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{formatDuration(d.minutes)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

   
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Clocked In</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.clockedIn}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">On Break</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.onBreak}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Clocked Out</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.clockedOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Hours</p>
                  <p className="text-xl sm:text-2xl font-bold">{formatDuration(summary.totalMinutes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Time Entries ({sortedEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-5 sm:pb-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading time entries...
                </div>
              </div>
            ) : (
              <>
                {sortedEntries.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="flex justify-center mb-3">
                      <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">No time entries found</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Add a new entry to get started
                    </p>
                  </div>
                ) : (
                  sortedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col lg:flex-row lg:items-center gap-4 p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent sm:border-0"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        navigate(`history/${encodeURIComponent(String(entry.employee || "").trim())}`);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          navigate(`history/${encodeURIComponent(String(entry.employee || "").trim())}`);
                        }
                      }}
                    >
                      {/* Avatar and Employee Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                          {entry.avatar ? (
                            <AvatarImage
                              src={entry.avatar}
                              alt={entry.employee || "Employee"}
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                            {String(entry.employee || "").trim().slice(0, 1).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm sm:text-base truncate">{entry.employee}</h4>
                            <Badge className={`${statusClasses[entry.status]} text-xs`} variant="secondary">
                              {statusLabels[entry.status]}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[150px] sm:max-w-[200px]">{entry.location}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              {formatEntryDate(entry.date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Time Info and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4 pl-13 sm:pl-0">
                        {/* Clock Times */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                          <div className="flex items-center gap-2 sm:justify-end">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">
                              IN
                            </span>
                            <span className="text-sm sm:text-base font-medium">{entry.clockIn}</span>
                          </div>
                          {entry.clockOut ? (
                            <div className="flex items-center gap-2 sm:justify-end">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                                OUT
                              </span>
                              <span className="text-sm sm:text-base font-medium">{entry.clockOut}</span>
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm text-muted-foreground">—</span>
                          )}
                          <p
                            className={
                              "text-base sm:text-lg font-extrabold text-foreground sm:text-right " +
                              "bg-accent/10 border border-accent/20 rounded-md px-2 py-0.5"
                            }
                          >
                            {entry.clockOut ? formatDuration(calcEntryMinutes(entry)) : "—"}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {entry.status !== "clocked-out" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                clockOutNow(entry.id);
                              }}
                            >
                              Clock Out
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  removeEntry(entry.id);
                                }}
                                className="text-destructive text-xs sm:text-sm"
                              >
                                Remove Entry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
};

export default TimeTracking;