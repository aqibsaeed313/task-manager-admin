import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Avatar, AvatarFallback } from "@/components/admin/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CalendarClock,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  Users,
  Power,
} from "lucide-react";
import { createResource, deleteResource, listResource, updateResource } from "@/lib/admin/apiClient";

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  company?: string;
  status: "active" | "inactive" | "on-leave";
  payRate: string;
  hireDate: string;
  shift?: string;
}

const statusClasses = {
  active: "bg-success/10 text-success",
  inactive: "bg-muted text-muted-foreground",
  "on-leave": "bg-warning/10 text-warning",
};

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [employeesList, setEmployeesList] = useState<Employee[]>(() => []);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    company: "",
    status: "active" as Employee["status"],
    payRate: "",
    hireDate: "",
  });

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    company: "",
    status: "active" as Employee["status"],
    payRate: "",
    hireDate: "",
  });

  const [shiftFormData, setShiftFormData] = useState({
    shift: "",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        const list = await listResource<Employee>("employees");
        if (!mounted) return;
        setEmployeesList(list);
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load employees");
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

  const refreshEmployees = async () => {
    const list = await listResource<Employee>("employees");
    setEmployeesList(list);
  };

  const handleAddEmployee = async () => {
    if (!formData.name || !formData.email || !formData.department || !formData.role) return;
    try {
      setApiError(null);
      const newEmployee: Employee = {
        id: `EMP-${Date.now().toString().slice(-6)}`,
        name: formData.name,
        initials: formData.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        company: formData.company || "",
        status: formData.status,
        payRate: formData.payRate,
        hireDate: formData.hireDate,
      };
      await createResource<Employee>("employees", newEmployee);
      await refreshEmployees();
      setAddEmployeeOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "",
        department: "",
        company: "",
        status: "active",
        payRate: "",
        hireDate: "",
      });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to create employee");
    }
  };

  const departments = useMemo(
    () => [...new Set(employeesList.map((e) => e.department))],
    [employeesList]
  );

  const roles = useMemo(() => [...new Set(employeesList.map((e) => e.role))], [employeesList]);
  const companies = useMemo(() => [...new Set(employeesList.map((e) => e.company).filter(Boolean))] as string[], [employeesList]);

  const handleViewProfile = (employee: Employee) => {
    setSelectedEmployee(employee);
    setViewProfileOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      department: employee.department,
      company: employee.company || "",
      status: employee.status,
      payRate: employee.payRate,
      hireDate: employee.hireDate,
    });
    setEditEmployeeOpen(true);
  };

  const saveEditEmployee = async () => {
    if (!selectedEmployee) return;
    if (!editFormData.name || !editFormData.email || !editFormData.department || !editFormData.role) return;
    try {
      setApiError(null);
      await updateResource<Employee>("employees", selectedEmployee.id, {
        ...selectedEmployee,
        name: editFormData.name,
        initials: editFormData.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        email: editFormData.email,
        phone: editFormData.phone,
        role: editFormData.role,
        department: editFormData.department,
        company: editFormData.company || "",
        status: editFormData.status,
        payRate: editFormData.payRate,
        hireDate: editFormData.hireDate,
      });
      await refreshEmployees();
      setEditEmployeeOpen(false);
      setSelectedEmployee(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update employee");
    }
  };

  const handleDeactivateConfirm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeactivateConfirmOpen(true);
  };

  const confirmToggleActive = async () => {
    if (!selectedEmployee) return;
    try {
      setApiError(null);
      await updateResource<Employee>("employees", selectedEmployee.id, {
        ...selectedEmployee,
        status: selectedEmployee.status === "inactive" ? "active" : "inactive",
      });
      await refreshEmployees();
      setDeactivateConfirmOpen(false);
      setSelectedEmployee(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update employee");
    }
  };

  const handleDeleteConfirm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEmployee) return;
    try {
      setApiError(null);
      await deleteResource("employees", selectedEmployee.id);
      await refreshEmployees();
      setDeleteConfirmOpen(false);
      setSelectedEmployee(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to delete employee");
    }
  };

  const handleShift = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShiftFormData({ shift: employee.shift ?? "" });
    setShiftOpen(true);
  };

  const saveShift = async () => {
    if (!selectedEmployee) return;
    try {
      setApiError(null);
      await updateResource<Employee>("employees", selectedEmployee.id, {
        ...selectedEmployee,
        shift: shiftFormData.shift,
      });
      await refreshEmployees();
      setShiftOpen(false);
      setSelectedEmployee(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update shift");
    }
  };

  const filteredEmployees = employeesList.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    const matchesDepartment =
      departmentFilter === "all" || employee.department === departmentFilter;
    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    const matchesCompany = companyFilter === "all" || (employee.company || "") === companyFilter;
    return matchesSearch && matchesStatus && matchesDepartment && matchesRole && matchesCompany;
  });

  return (
    <AdminLayout>
      {/* Mobile-first container */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        
        {/* Page Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Employee Directory
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Manage employee profiles, roles, and access levels.
            </p>
          </div>

          {/* Add Employee Dialog */}
          <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add Employee</span>
              </Button>
            </DialogTrigger>
            
            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Add New Employee</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new employee profile and add them to the directory
                </DialogDescription>
              </DialogHeader>
              
              <form className="space-y-4 sm:space-y-5">
                {/* Name & Email - Stack on mobile, row on tablet+ */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                      required
                    />
                  </div>
                </div>

                {/* Phone & Role */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Role *</label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="e.g., Maintenance Technician"
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                      required
                    />
                  </div>
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g., TaskFlow"
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>

                {/* Department & Pay Rate */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Department *</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                      required
                    >
                      <option value="">Select department</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Field Operations">Field Operations</option>
                      <option value="Landscaping">Landscaping</option>
                      <option value="Security">Security</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Pay Rate</label>
                    <input
                      type="text"
                      value={formData.payRate}
                      onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                      placeholder="$25/hr"
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Hire Date & Status */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Hire Date</label>
                    <input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Employee["status"] })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on-leave">On Leave</option>
                    </select>
                  </div>
                </div>
              </form>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                <Button
                  variant="outline"
                  onClick={() => setAddEmployeeOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEmployee}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Add Employee
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

        {/* Filters Card - Responsive */}
        <Card className="shadow-soft border-0 sm:border">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search - Full width on mobile */}
              <div className="relative w-full">
                <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                  Search Employees
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Filter Dropdowns - Grid on mobile, row on tablet+ */}
              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3">
                <div className="col-span-1">
                  <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                    Department
                  </label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept} className="text-xs sm:text-sm">
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                    Role
                  </label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs sm:text-sm">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                    Company
                  </label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs sm:text-sm">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Employees ({filteredEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading employees...
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="block sm:hidden space-y-3 p-4">
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} className="bg-white rounded-lg border p-4 space-y-3">
                      {/* Header with Avatar and Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {employee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">{employee.id}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewProfile(employee)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Employee
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShift(employee)}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Shift
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeactivateConfirm(employee)}
                              className="text-destructive"
                            >
                              <Power className="mr-2 h-4 w-4" />
                              {employee.status === "inactive" ? "Activate" : "Deactivate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteConfirm(employee)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Status Badge */}
                      <div className="flex justify-start">
                        <Badge className={`${statusClasses[employee.status]} text-xs`} variant="secondary">
                          {employee.status}
                        </Badge>
                      </div>

                      {/* Employee Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="col-span-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs truncate">{employee.role}</span>
                          </div>
                        </div>
                        
                        <div className="col-span-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs truncate">{employee.department}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs truncate">{employee.email}</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs truncate">{employee.phone}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">{employee.payRate}</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">{employee.hireDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredEmployees.length === 0 && (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">No employees found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your filters or add a new employee
                      </p>
                    </div>
                  )}
                </div>

                {/* Tablet/Desktop View - Table */}
                <div className="hidden sm:block w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm w-[18%]">Employee</TableHead>
                        <TableHead className="text-xs md:text-sm w-[20%]">Contact</TableHead>
                        <TableHead className="text-xs md:text-sm w-[12%]">Role</TableHead>
                        <TableHead className="text-xs md:text-sm w-[12%]">Department</TableHead>
                        <TableHead className="text-xs md:text-sm w-[10%]">Pay Rate</TableHead>
                        <TableHead className="text-xs md:text-sm w-[10%]">Status</TableHead>
                        <TableHead className="text-xs md:text-sm w-[10%]">Hire Date</TableHead>
                        <TableHead className="text-right text-xs md:text-sm w-[8%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                                  {employee.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm md:text-base truncate max-w-[150px] lg:max-w-[200px]">
                                  {employee.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{employee.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-xs md:text-sm">
                                <Mail className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground truncate max-w-[150px] lg:max-w-[200px]">
                                  {employee.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs md:text-sm">
                                <Phone className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground truncate max-w-[150px] lg:max-w-[200px]">
                                  {employee.phone}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm md:text-base truncate max-w-[120px] lg:max-w-[150px]">
                              {employee.role}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm md:text-base truncate max-w-[120px] lg:max-w-[150px]">
                              {employee.department}
                            </p>
                          </TableCell>
                          <TableCell className="font-medium text-sm md:text-base">
                            {employee.payRate}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${statusClasses[employee.status]} text-xs md:text-sm`} 
                              variant="secondary"
                            >
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm md:text-base text-muted-foreground">
                            {employee.hireDate}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewProfile(employee)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Employee
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShift(employee)}>
                                  <CalendarClock className="mr-2 h-4 w-4" />
                                  Shift
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeactivateConfirm(employee)}
                                  className="text-destructive"
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  {employee.status === "inactive" ? "Activate" : "Deactivate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteConfirm(employee)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
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

      {/* View Profile Dialog - Responsive */}
      <Dialog open={viewProfileOpen} onOpenChange={setViewProfileOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm sm:text-base">
                      {selectedEmployee.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base sm:text-lg font-semibold break-words">{selectedEmployee.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{selectedEmployee.id}</p>
                  </div>
                </div>
                <Badge className={`${statusClasses[selectedEmployee.status]} text-xs sm:text-sm self-start sm:self-center`} variant="secondary">
                  {selectedEmployee.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Email</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground break-all">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedEmployee.email}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Phone</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground break-all">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedEmployee.phone}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Role</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedEmployee.role}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Department</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedEmployee.department}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Pay Rate</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedEmployee.payRate}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Hire Date</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedEmployee.hireDate}</span>
                  </div>
                </div>
                
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Shift</label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {selectedEmployee.shift ? selectedEmployee.shift : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 sm:mt-6">
            <Button onClick={() => setViewProfileOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog - Responsive */}
      <Dialog open={editEmployeeOpen} onOpenChange={setEditEmployeeOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Edit Employee</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update employee information and save changes
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <form className="space-y-4 sm:space-y-5">
              {/* Name & Email */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Phone & Role */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Role *</label>
                  <input
                    type="text"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Department & Company */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Department *</label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Company</label>
                  <input
                    type="text"
                    value={editFormData.company}
                    onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Pay Rate & Hire Date & Status */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Pay Rate</label>
                  <input
                    type="text"
                    value={editFormData.payRate}
                    onChange={(e) => setEditFormData({ ...editFormData, payRate: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Hire Date</label>
                  <input
                    type="date"
                    value={editFormData.hireDate}
                    onChange={(e) => setEditFormData({ ...editFormData, hireDate: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as Employee["status"] })
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>
              </div>
            </form>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setEditEmployeeOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveEditEmployee} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Shift Dialog - Responsive */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Assign Shift</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Set shift for the selected employee
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 sm:p-4 bg-muted/30">
                <p className="text-xs sm:text-sm font-medium mb-1">Employee</p>
                <p className="text-sm sm:text-base font-medium">{selectedEmployee.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{selectedEmployee.id}</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5">Shift Details</label>
                <input
                  type="text"
                  value={shiftFormData.shift}
                  onChange={(e) => setShiftFormData({ shift: e.target.value })}
                  placeholder="e.g., Morning (9am - 5pm)"
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShiftOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveShift} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
            >
              Save Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Confirm Dialog - Responsive */}
      <Dialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">
              {selectedEmployee?.status === "inactive" ? "Activate Employee" : "Deactivate Employee"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedEmployee?.status === "inactive"
                ? "This employee will be marked as active again."
                : "This employee will be marked as inactive. You can activate them again later."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="rounded-md bg-muted p-3 sm:p-4 text-xs sm:text-sm mt-2">
              <p className="font-medium break-words">{selectedEmployee.name}</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words mt-1">
                {selectedEmployee.id}
              </p>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setDeactivateConfirmOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmToggleActive}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {selectedEmployee?.status === "inactive" ? "Activate" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirm Dialog - Responsive */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">
              Delete Employee
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This action cannot be undone. The employee will be permanently removed from the system.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="rounded-md bg-muted p-3 sm:p-4 text-xs sm:text-sm mt-2">
              <p className="font-medium break-words">{selectedEmployee.name}</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words mt-1">
                {selectedEmployee.id}
              </p>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Employees;