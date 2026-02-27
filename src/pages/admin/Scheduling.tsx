import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
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
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Calendar,
  MapPin,
  User,
  Clock,
  Bell
} from "lucide-react";
import { createResource, deleteResource, listResource, updateResource } from "@/lib/admin/apiClient";

interface ScheduleItem {
  id: string;
  location: string;
  employee: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "canceled";
  plannedTask?: string;
  reminder?: "none" | "30m" | "1h" | "1d";
}

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

const SCHEDULING_STORAGE_KEY = "schedules";

const seedSchedules: ScheduleItem[] = [
  {
    id: "SCH-001",
    location: "Building A - Corporate Office",
    employee: "John Doe",
    date: "2026-02-03",
    startTime: "09:00",
    endTime: "17:00",
    status: "scheduled",
    plannedTask: "HVAC filter replacement",
    reminder: "1h",
  },
  {
    id: "SCH-002",
    location: "Warehouse C",
    employee: "Emily Brown",
    date: "2026-02-03",
    startTime: "10:00",
    endTime: "18:00",
    status: "scheduled",
    plannedTask: "Inspection - safety equipment",
    reminder: "30m",
  },
];

const statusClasses = {
  scheduled: "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
  canceled: "bg-destructive/10 text-destructive",
};

export default function Scheduling() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ScheduleItem | null>(null);

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    location: "",
    employee: "",
    date: "",
    startTime: "",
    endTime: "",
    status: "scheduled" as ScheduleItem["status"],
    plannedTask: "",
    reminder: "none" as NonNullable<ScheduleItem["reminder"]>,
  });

  const [editFormData, setEditFormData] = useState({
    location: "",
    employee: "",
    date: "",
    startTime: "",
    endTime: "",
    status: "scheduled" as ScheduleItem["status"],
    plannedTask: "",
    reminder: "none" as NonNullable<ScheduleItem["reminder"]>,
  });

  const normalizeDateForInput = (value: string) => {
    if (!value) return "";
    const trimmed = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes("T")) {
      const maybe = trimmed.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(maybe)) return maybe;
    }

    const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      const mm = mdy[1].padStart(2, "0");
      const dd = mdy[2].padStart(2, "0");
      return `${mdy[3]}-${mm}-${dd}`;
    }

    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    return "";
  };

  const normalizeTimeForInput = (value: string) => {
    if (!value) return "";
    const trimmed = String(value).trim();
    if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;

    const ampm = trimmed.replace(".", ":").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampm) {
      let hh = Number(ampm[1]);
      const mm = ampm[2];
      const ap = ampm[3].toUpperCase();
      if (ap === "AM" && hh === 12) hh = 0;
      if (ap === "PM" && hh < 12) hh += 12;
      return `${String(hh).padStart(2, "0")}:${mm}`;
    }

    const loose = trimmed.replace(".", ":").match(/^(\d{1,2}):(\d{2})$/);
    if (loose) return `${String(Number(loose[1])).padStart(2, "0")}:${loose[2]}`;
    return "";
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        
        // Fetch schedules
        const list = await listResource<ScheduleItem>("schedules");
        if (!mounted) return;
        setSchedules(list);
        
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
                initials: u.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase(),
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
        setApiError(e instanceof Error ? e.message : "Failed to load schedules");
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

  const refreshSchedules = async () => {
    const list = await listResource<ScheduleItem>("schedules");
    setSchedules(list);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter((s) => {
      return (
        s.location.toLowerCase().includes(q) ||
        s.employee.toLowerCase().includes(q) ||
        s.date.toLowerCase().includes(q)
      );
    });
  }, [schedules, searchQuery]);

  const addSchedule = async () => {
    if (!formData.location || !formData.employee || !formData.date) return;
    const next: ScheduleItem = {
      id: `SCH-${Date.now().toString().slice(-6)}`,
      location: formData.location,
      employee: formData.employee,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      status: formData.status,
      plannedTask: formData.plannedTask || "",
      reminder: formData.reminder,
    };
    try {
      setApiError(null);
      await createResource<ScheduleItem>("schedules", next);
      await refreshSchedules();
      setAddOpen(false);
      setFormData({
        location: "",
        employee: "",
        date: "",
        startTime: "",
        endTime: "",
        status: "scheduled",
        plannedTask: "",
        reminder: "none",
      });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to add schedule");
    }
  };

  const onEdit = (s: ScheduleItem) => {
    setSelected(s);
    setEditFormData({
      location: s.location,
      employee: s.employee,
      date: normalizeDateForInput(s.date),
      startTime: normalizeTimeForInput(s.startTime),
      endTime: normalizeTimeForInput(s.endTime),
      status: s.status,
      plannedTask: s.plannedTask || "",
      reminder: s.reminder || "none",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected) return;

    const normalizedDate = normalizeDateForInput(editFormData.date);
    const normalizedStart = normalizeTimeForInput(editFormData.startTime);
    const normalizedEnd = normalizeTimeForInput(editFormData.endTime);

    if (!editFormData.location || !editFormData.employee || !normalizedDate) {
      setApiError("Please fill Location, Employee, and Date before saving.");
      return;
    }
    try {
      setApiError(null);
      await updateResource<ScheduleItem>("schedules", selected.id, {
        ...selected,
        location: editFormData.location,
        employee: editFormData.employee,
        date: normalizedDate,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        status: editFormData.status,
        plannedTask: editFormData.plannedTask || "",
        reminder: editFormData.reminder,
      });
      await refreshSchedules();
      setEditOpen(false);
      setSelected(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update schedule");
    }
  };

  const onDelete = (s: ScheduleItem) => {
    setSelected(s);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    try {
      setApiError(null);
      await deleteResource("schedules", selected.id);
      await refreshSchedules();
      setDeleteOpen(false);
      setSelected(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to delete schedule");
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
              Location Scheduling
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Create daily/weekly schedules and assign shifts.
            </p>
          </div>

          {/* Add Schedule Dialog */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add Schedule</span>
              </Button>
            </DialogTrigger>
            
            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Add Schedule</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new shift schedule
                </DialogDescription>
              </DialogHeader>
              
              <form className="space-y-4 sm:space-y-5">
                {/* Location & Employee */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Location *</label>
                    <input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                      placeholder="Building A - Corporate Office"
                      required
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Employee *</label>
                    <select
                      value={formData.employee}
                      onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                      required
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
                </div>

                {/* Date, Start Time, End Time */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ScheduleItem["status"] })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                </div>

                {/* Planned Task & Reminder */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Planned Task (per location)</label>
                    <input
                      value={formData.plannedTask}
                      onChange={(e) => setFormData({ ...formData, plannedTask: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                      placeholder="e.g., Deep cleaning"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Reminder</label>
                    <select
                      value={formData.reminder}
                      onChange={(e) =>
                        setFormData({ ...formData, reminder: e.target.value as NonNullable<ScheduleItem["reminder"]> })
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                    >
                      <option value="none">None</option>
                      <option value="30m">30 minutes</option>
                      <option value="1h">1 hour</option>
                      <option value="1d">1 day</option>
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
                  onClick={addSchedule} 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Add Schedule
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

        {/* Search Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardContent className="p-3 sm:p-6">
            <div className="relative w-full sm:max-w-md">
              <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                Search Schedules
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location, employee, or date..."
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedules Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Schedules ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading schedules...
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="block sm:hidden space-y-3 p-4">
                  {filtered.map((s) => (
                    <div key={s.id} className="bg-white rounded-lg border p-4 space-y-3">
                      {/* Header with Date and Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-4 w-4 text-info" />
                          </div>
                          <div>
                            <p className="text-xs font-medium">{s.date}</p>
                            <p className="text-xs text-muted-foreground">{s.id}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(s)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(s)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Status Badge */}
                      <div className="flex justify-start">
                        <Badge className={`${statusClasses[s.status]} text-xs`} variant="secondary">
                          {s.status}
                        </Badge>
                      </div>

                      {/* Location */}
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">Location</p>
                          <p className="text-sm">{s.location}</p>
                        </div>
                      </div>

                      {/* Employee */}
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">Employee</p>
                          <p className="text-sm">{s.employee}</p>
                        </div>
                      </div>

                      {/* Time */}
                      {s.startTime && s.endTime && (
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium">Time</p>
                            <p className="text-sm">{s.startTime} - {s.endTime}</p>
                          </div>
                        </div>
                      )}

                      {/* Planned Task */}
                      {s.plannedTask && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium mb-1">Planned Task</p>
                          <p className="text-sm text-muted-foreground">{s.plannedTask}</p>
                          {s.reminder && s.reminder !== "none" && (
                            <div className="flex items-center gap-1 mt-1">
                              <Bell className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Reminder: {s.reminder === "30m" ? "30 minutes" : 
                                          s.reminder === "1h" ? "1 hour" : 
                                          s.reminder === "1d" ? "1 day" : s.reminder}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {filtered.length === 0 && (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">No schedules found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search or add a new schedule
                      </p>
                    </div>
                  )}
                </div>

                {/* Tablet/Desktop View - Table */}
                <div className="hidden sm:block w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm w-[15%]">Shift</TableHead>
                        <TableHead className="text-xs md:text-sm w-[20%]">Location</TableHead>
                        <TableHead className="text-xs md:text-sm w-[15%]">Employee</TableHead>
                        <TableHead className="text-xs md:text-sm w-[12%]">Time</TableHead>
                        <TableHead className="text-xs md:text-sm w-[20%]">Planned Task</TableHead>
                        <TableHead className="text-xs md:text-sm w-[10%]">Status</TableHead>
                        <TableHead className="text-right text-xs md:text-sm w-[8%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <span className="text-sm md:text-base">{s.date}</span>
                                <p className="text-xs text-muted-foreground">{s.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm md:text-base truncate max-w-[200px] lg:max-w-[250px]">
                              {s.location}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm md:text-base">
                            {s.employee}
                          </TableCell>
                          <TableCell className="text-sm md:text-base text-muted-foreground">
                            {s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[150px] max-w-[200px]">
                              <p className="text-sm md:text-base truncate">
                                {s.plannedTask || "—"}
                              </p>
                              {s.reminder && s.reminder !== "none" ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Bell className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground">
                                    {s.reminder === "30m" ? "30 min" : 
                                     s.reminder === "1h" ? "1 hour" : 
                                     s.reminder === "1d" ? "1 day" : s.reminder}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${statusClasses[s.status]} text-xs md:text-sm`} 
                              variant="secondary"
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(s)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(s)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog - Responsive */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Edit Schedule</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update schedule information and save changes
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <form className="space-y-4 sm:space-y-5">
              {/* Location & Employee */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Location *</label>
                  <input
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Employee *</label>
                  <select
                    value={editFormData.employee}
                    onChange={(e) => setEditFormData({ ...editFormData, employee: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date, Start Time, End Time */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={editFormData.startTime}
                    onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={editFormData.endTime}
                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as ScheduleItem["status"] })
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>

              {/* Planned Task & Reminder */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Planned Task (per location)</label>
                  <input
                    value={editFormData.plannedTask}
                    onChange={(e) => setEditFormData({ ...editFormData, plannedTask: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Reminder</label>
                  <select
                    value={editFormData.reminder}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, reminder: e.target.value as NonNullable<ScheduleItem["reminder"]> })
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                  >
                    <option value="none">None</option>
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="1d">1 day</option>
                  </select>
                </div>
              </div>
            </form>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setEditOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveEdit} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog - Responsive */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">
              Remove Schedule
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This schedule entry will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          
          {selected && (
            <div className="rounded-md bg-muted p-3 sm:p-4 text-xs sm:text-sm mt-2 space-y-1">
              <p className="font-medium break-words">{selected.location}</p>
              <p className="text-muted-foreground break-words">
                {selected.employee} • {selected.date}
              </p>
              {selected.startTime && selected.endTime && (
                <p className="text-xs text-muted-foreground">
                  {selected.startTime} - {selected.endTime}
                </p>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setDeleteOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}