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
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, UserX } from "lucide-react";
import { createResource, deleteResource, listResource, updateResource } from "@/lib/admin/apiClient";

interface BlacklistItem {
  id: string;
  name: string;
  employeeId?: string;
  reason: string;
  incidentNotes: string;
  addedAt: string;
  status: "active" | "resolved";
}

type BackendDoNotHire = {
  id?: string;
  _id?: string;
  name?: string;
  employeeId?: string;
  employeeName?: string;
  employee?: {
    id?: string;
    _id?: string;
    name?: string;
  };
  reason?: string;
  incidentNotes?: string;
  notes?: string;
  addedAt?: string;
  createdAt?: string;
  date?: string;
  status?: string;
  resolved?: boolean;
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

const seedItems: BlacklistItem[] = [
  {
    id: "DNH-001",
    name: "Sample Candidate",
    reason: "Policy violation",
    incidentNotes: "Repeated no-shows during probation.",
    addedAt: "2026-02-03",
    status: "active",
  },
];

const statusClasses = {
  active: "bg-destructive/10 text-destructive",
  resolved: "bg-success/10 text-success",
};

const toDateOnly = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "";
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
};

const normalizeDoNotHireItem = (item: BackendDoNotHire, employeesById: Map<string, Employee>): BlacklistItem => {
  const id = String(item.id || item._id || "");
  const employeeId =
    item.employeeId || item.employee?.id || item.employee?._id
      ? String(item.employeeId || item.employee?.id || item.employee?._id)
      : undefined;
  const fromEmployee = employeeId ? employeesById.get(employeeId)?.name : undefined;
  const name = String(fromEmployee || item.employeeName || item.employee?.name || item.name || employeeId || "").trim();
  const rawStatus = String(item.status || "active").toLowerCase();
  const status: BlacklistItem["status"] =
    item.resolved === true || rawStatus === "resolved" || rawStatus === "inactive" || rawStatus === "closed"
      ? "resolved"
      : "active";
  const addedAt = String(item.addedAt || item.createdAt || item.date || "");

  return {
    id,
    name,
    employeeId,
    reason: String(item.reason || ""),
    incidentNotes: String(item.incidentNotes || item.notes || ""),
    addedAt,
    status,
  };
};

export default function DoNotHire() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "name_asc" | "name_desc" | "status">("date_desc");
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selected, setSelected] = useState<BlacklistItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [items, setItems] = useState<BlacklistItem[]>(() => []);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    employeeId: "",
    reason: "",
    incidentNotes: "",
    status: "active" as BlacklistItem["status"],
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    employeeId: "",
    reason: "",
    incidentNotes: "",
    status: "active" as BlacklistItem["status"],
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);

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

        // Fetch blacklist items
        const list = await listResource<BackendDoNotHire>("do-not-hire");
        if (!mounted) return;
        const employeesById = new Map(allEmployees.map((e) => [e.id, e] as const));
        setItems(list.map((i) => normalizeDoNotHireItem(i, employeesById)).filter((i) => Boolean(i.id)));
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load records");
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
    const list = await listResource<BackendDoNotHire>("do-not-hire");
    const employeesById = new Map(employees.map((e) => [e.id, e] as const));
    setItems(list.map((i) => normalizeDoNotHireItem(i, employeesById)).filter((i) => Boolean(i.id)));
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = !q
      ? items
      : items.filter((i) => {
      return i.name.toLowerCase().includes(q) || i.reason.toLowerCase().includes(q);
    });

    const sorted = base.slice().sort((a, b) => {
      const aName = a.name || "";
      const bName = b.name || "";
      const aStatus = a.status || "";
      const bStatus = b.status || "";
      const aDate = a.addedAt || "";
      const bDate = b.addedAt || "";
      
      if (sortBy === "name_asc") return aName.localeCompare(bName);
      if (sortBy === "name_desc") return bName.localeCompare(aName);
      if (sortBy === "status") return aStatus.localeCompare(bStatus);
      if (sortBy === "date_asc") return aDate.localeCompare(bDate);
      return bDate.localeCompare(aDate);
    });
    return sorted;
  }, [items, searchQuery, sortBy]);

  const addItem = async () => {
    if (!formData.employeeId || !formData.reason) return;
    const selectedEmployee = employees.find((e) => e.id === formData.employeeId);
    const selectedName = String(selectedEmployee?.name || formData.name || "").trim();
    if (!selectedName) return;
    const payload: BackendDoNotHire = {
      name: selectedName,
      employeeId: formData.employeeId || undefined,
      reason: formData.reason,
      incidentNotes: formData.incidentNotes,
      notes: formData.incidentNotes,
      status: formData.status,
      resolved: formData.status === "resolved",
      addedAt: new Date().toISOString(),
      date: new Date().toISOString(),
    };
    try {
      setApiError(null);
      await createResource<BackendDoNotHire>("do-not-hire", payload);
      await refresh();
      setAddOpen(false);
      setFormData({ name: "", employeeId: "", reason: "", incidentNotes: "", status: "active" });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to add record");
    }
  };

  const onView = (i: BlacklistItem) => {
    setSelected(i);
    setViewOpen(true);
  };

  const onEdit = (i: BlacklistItem) => {
    setSelected(i);
    setEditFormData({
      name: i.name,
      employeeId: i.employeeId || "",
      reason: i.reason,
      incidentNotes: i.incidentNotes,
      status: i.status,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    if (!editFormData.employeeId || !editFormData.reason) return;
    const selectedEmployee = employees.find((e) => e.id === editFormData.employeeId);
    const selectedName = String(selectedEmployee?.name || editFormData.name || "").trim();
    if (!selectedName) return;
    try {
      setApiError(null);
      await updateResource<BackendDoNotHire>("do-not-hire", selected.id, {
        name: selectedName,
        employeeId: editFormData.employeeId || undefined,
        reason: editFormData.reason,
        incidentNotes: editFormData.incidentNotes,
        notes: editFormData.incidentNotes,
        status: editFormData.status,
        resolved: editFormData.status === "resolved",
      });
      await refresh();
      setEditOpen(false);
      setSelected(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update record");
    }
  };

  const onRemove = (i: BlacklistItem) => {
    setSelected(i);
    setRemoveOpen(true);
  };

  const confirmRemove = async () => {
    if (!selected) return;
    try {
      setApiError(null);
      await deleteResource("do-not-hire", selected.id);
      await refresh();
      setRemoveOpen(false);
      setSelected(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to remove record");
    }
  };

  return (
    <AdminLayout>
      {/* Mobile-first padding and spacing */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        
        {/* Header Section - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Do Not Hire List
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Maintain a blacklist of profiles and incidents.
            </p>
          </div>

          {/* Add Record Button Dialog */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add Record</span>
              </Button>
            </DialogTrigger>
            
            {/* Add Dialog - Fully Responsive */}
            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Add Do Not Hire Record</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new blacklist entry
                </DialogDescription>
              </DialogHeader>
              
              <form className="space-y-4 sm:space-y-5">
                {/* Name & Reason - Stack on mobile, row on tablet+ */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Employee *</label>
                    <select
                      value={formData.employeeId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = employees.find((e) => e.id === empId);
                        setFormData({ ...formData, employeeId: empId, name: emp?.name || "" });
                      }}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                      required
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    {employees.length === 0 && (
                      <p className="text-xs text-warning mt-1">No employees found.</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Reason *</label>
                    <input
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                      placeholder="Policy violation"
                      required
                    />
                  </div>
                </div>

                {/* Incident Notes */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Incident Notes</label>
                  <textarea
                    value={formData.incidentNotes}
                    onChange={(e) => setFormData({ ...formData, incidentNotes: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base min-h-[80px] sm:min-h-24 resize-none"
                    placeholder="Detailed description of incident..."
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as BlacklistItem["status"] })
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
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
                  onClick={addItem} 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Add Record
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

        {/* Search and Sort Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
              {/* Search - Full width on mobile */}
              <div className="relative w-full sm:flex-1">
                <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or reason..."
                    className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Sort Dropdown */}
              <div className="w-full sm:w-56 md:w-64">
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                >
                  <option value="date_desc">Date (Newest First)</option>
                  <option value="date_asc">Date (Oldest First)</option>
                  <option value="name_asc">Name (A to Z)</option>
                  <option value="name_desc">Name (Z to A)</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Records ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading records...
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="block sm:hidden space-y-3 p-4">
                  {filtered.map((i) => (
                    <div key={i.id} className="bg-white rounded-lg border p-4 space-y-3">
                      {/* Header with Icon and Name */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <UserX className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{i.name}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(i)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(i)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRemove(i)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Reason</p>
                          <p className="text-sm mt-0.5">{i.reason}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <Badge 
                              className={`${statusClasses[i.status]} mt-1 text-xs`} 
                              variant="secondary"
                            >
                              {i.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Date Added</p>
                            <p className="text-sm mt-1">{toDateOnly(i.addedAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filtered.length === 0 && (
                    <div className="text-center py-8">
                      <UserX className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No records found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search or add a new record
                      </p>
                    </div>
                  )}
                </div>

                {/* Tablet/Desktop View - Table */}
                <div className="hidden sm:block w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm w-[30%]">Profile</TableHead>
                        <TableHead className="text-xs md:text-sm w-[25%]">Reason</TableHead>
                        <TableHead className="text-xs md:text-sm w-[15%]">Status</TableHead>
                        <TableHead className="text-xs md:text-sm w-[15%]">Date</TableHead>
                        <TableHead className="text-right text-xs md:text-sm w-[15%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((i) => (
                        <TableRow key={i.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <UserX className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm md:text-base truncate max-w-[200px] lg:max-w-none">
                                  {i.name}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="text-sm md:text-base truncate max-w-[200px] lg:max-w-none">
                                {i.reason}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${statusClasses[i.status]} text-xs md:text-sm`} 
                              variant="secondary"
                            >
                              {i.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm md:text-base text-muted-foreground">
                            {toDateOnly(i.addedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onView(i)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(i)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onRemove(i)} className="text-destructive">
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

      {/* View Details Dialog - Responsive */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Record Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 sm:space-y-5">
              <div className="border-b pb-3 sm:pb-4">
                <p className="text-lg sm:text-xl font-semibold break-words">{selected.name}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Reason</label>
                  <p className="text-sm sm:text-base text-muted-foreground break-words">
                    {selected.reason}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Status</label>
                  <div>
                    <Badge 
                      className={`${statusClasses[selected.status]} text-xs sm:text-sm`} 
                      variant="secondary"
                    >
                      {selected.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Date Added</label>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {toDateOnly(selected.addedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 sm:mt-6">
            <Button onClick={() => setViewOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Responsive */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Edit Record</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update record and save changes
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <form className="space-y-4 sm:space-y-5">
              {/* Employee & Reason */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Employee *</label>
                  <select
                    value={editFormData.employeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = employees.find((e) => e.id === empId);
                      setEditFormData({ ...editFormData, employeeId: empId, name: emp?.name || "" });
                    }}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Reason *</label>
                  <input
                    value={editFormData.reason}
                    onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Incident Notes */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5">Incident Notes</label>
                <textarea
                  value={editFormData.incidentNotes}
                  onChange={(e) => setEditFormData({ ...editFormData, incidentNotes: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base min-h-[80px] sm:min-h-24 resize-none"
                />
              </div>

              {/* Status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as BlacklistItem["status"] })
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Date Added</label>
                  <Input
                    type="date"
                    value={toDateOnly(selected.addedAt)}
                    disabled
                    className="bg-muted/20"
                  />
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

      {/* Remove Dialog - Responsive */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">
              Remove Record
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This entry will be permanently removed from the list.
            </DialogDescription>
          </DialogHeader>
          
          {selected && (
            <div className="rounded-md bg-muted p-3 sm:p-4 text-xs sm:text-sm mt-2">
              <p className="font-medium break-words">{selected.name}</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words">{selected.id}</p>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setRemoveOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemove}
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