import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
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
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Shield,
  UserCog,
  Mail,
  Calendar,
  Clock,
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger 
} from "@/components/admin/ui/dialog";
import { useForm } from "react-hook-form";
import { createResource, deleteResource, listResource, updateResource } from "@/lib/admin/apiClient";

interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: "admin" | "manager" | "employee";
  lastLogin: string;
  status: "active" | "inactive" | "pending";
  createdAt: string;
}

type BackendUser = {
  _id?: string;
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  role: "admin" | "manager" | "employee";
  status?: "active" | "inactive" | "pending";
  createdAt?: string;
  updatedAt?: string;
};

const initialUsers: User[] = [
  {
    id: "USR-001",
    name: "Admin User",
    initials: "AU",
    email: "admin@company.com",
    role: "admin",
    lastLogin: "2024-01-15 09:30 AM",
    status: "active",
    createdAt: "2020-01-01",
  },
  {
    id: "USR-002",
    name: "Manager One",
    initials: "MO",
    email: "manager1@company.com",
    role: "manager",
    lastLogin: "2024-01-15 08:45 AM",
    status: "active",
    createdAt: "2021-03-15",
  },
  {
    id: "USR-003",
    name: "John Doe",
    initials: "JD",
    email: "john.doe@company.com",
    role: "employee",
    lastLogin: "2024-01-14 05:30 PM",
    status: "active",
    createdAt: "2022-03-15",
  },
  {
    id: "USR-004",
    name: "Sarah Miller",
    initials: "SM",
    email: "sarah.miller@company.com",
    role: "manager",
    lastLogin: "2024-01-15 10:00 AM",
    status: "active",
    createdAt: "2021-08-20",
  },
  {
    id: "USR-005",
    name: "New Employee",
    initials: "NE",
    email: "new.employee@company.com",
    role: "employee",
    lastLogin: "-",
    status: "pending",
    createdAt: "2024-01-10",
  },
];

const roleClasses = {
  admin: "bg-destructive/10 text-destructive",
  manager: "bg-accent/10 text-accent",
  employee: "bg-muted text-muted-foreground",
};

const statusClasses = {
  active: "bg-success/10 text-success",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
};

const Users = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState<User[]>(() => []);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newRole, setNewRole] = useState<User["role"]>("employee");
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "employee" as User["role"],
    status: "active" as User["status"],
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        const list = await listResource<BackendUser>("users");

        const normalized = list.map((u) => ({
          id: u.id || u._id || "",
          name: u.name || u.username || "",
          initials: getInitials(u.name || u.username || "U"),
          email: u.email || "",
          role: u.role,
          lastLogin: "-",
          status: u.status || ("active" as const),
          createdAt: (u.createdAt || new Date().toISOString()).split("T")[0],
        }));

        if (!mounted) return;
        setUsers(normalized);
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load users");
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

  type FormValues = {
    name: string;
    password: string;
    email: string;
    role: string;
    status: string;
  };

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      password: "",
      email: "",
      role: "employee",
      status: "active",
    },
  });

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setViewDetailsOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setEditUserOpen(true);
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setChangeRoleOpen(true);
  };

  const handleDeactivate = (user: User) => {
    setSelectedUser(user);
    setDeactivateOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const refreshUsers = async () => {
    const list = await listResource<BackendUser>("users");
    const normalized = list.map((u) => ({
      id: u.id || u._id || "",
      name: u.name || u.username || "",
      initials: getInitials(u.name || u.username || "U"),
      email: u.email || "",
      role: u.role,
      lastLogin: "-",
      status: u.status || ("active" as const),
      createdAt: (u.createdAt || new Date().toISOString()).split("T")[0],
    }));
    setUsers(normalized);
  };

  const confirmDeactivate = async () => {
    if (!selectedUser) return;
    try {
      await updateResource<User>("users", selectedUser.id, { ...selectedUser, status: "inactive" });
      await refreshUsers();
      setDeactivateOpen(false);
      setSelectedUser(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  const confirmActivate = async () => {
    if (!selectedUser) return;
    try {
      await updateResource<User>("users", selectedUser.id, { ...selectedUser, status: "active" });
      await refreshUsers();
      setDeactivateOpen(false);
      setSelectedUser(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteResource("users", selectedUser.id);
      await refreshUsers();
      setDeleteOpen(false);
      setSelectedUser(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to delete user");
    }
  };

  const confirmChangeRole = async () => {
    if (!selectedUser) return;
    try {
      await updateResource<User>("users", selectedUser.id, { ...selectedUser, role: newRole });
      await refreshUsers();
      setChangeRoleOpen(false);
      setSelectedUser(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  const saveEditUser = async () => {
    if (!selectedUser) return;
    try {
      await updateResource<User>("users", selectedUser.id, {
        ...selectedUser,
        name: editFormData.name,
        initials: getInitials(editFormData.name || "U"),
        email: editFormData.email,
        role: editFormData.role,
        status: editFormData.status,
      });
      await refreshUsers();
      setEditUserOpen(false);
      setSelectedUser(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createResource<BackendUser>("users", {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role as BackendUser["role"],
        status: values.status as NonNullable<BackendUser["status"]>,
      });
      await refreshUsers();
      setOpen(false);
      form.reset();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to create user");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      String(user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(user.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout>
      {/* Mobile-first container */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        
        {/* Page Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Manage system users, roles, and permissions.
            </p>
          </div>

          {/* API Error Message */}
          {apiError && (
            <div className="rounded-md bg-destructive/10 p-3 sm:p-4 w-full sm:w-auto">
              <p className="text-xs sm:text-sm text-destructive break-words">
                {apiError}
              </p>
            </div>
          )}

          {/* Add User Dialog */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add User</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Add New User</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new system user and assign a role.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mt-2 sm:mt-4 space-y-4 sm:space-y-5"
              >
                <div className="space-y-3 sm:space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-medium">Full name</label>
                    <input
                      {...form.register("name", { required: true })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                      placeholder="Jane Doe"
                    />
                  </div>
                  
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-medium">Email</label>
                    <input
                      {...form.register("email", { required: true })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                      placeholder="jane.doe@company.com"
                      type="email"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-medium">Password</label>
                    <input
                      {...form.register("password", { required: true })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                      placeholder="Minimum 6 characters"
                      type="password"
                    />
                  </div>
                  
                  {/* Role & Status */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium">Role</label>
                      <select 
                        {...form.register("role")} 
                        className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium">Status</label>
                      <select 
                        {...form.register("status")} 
                        className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button 
                    type="button" 
                    onClick={() => setOpen(false)} 
                    className="w-full sm:w-auto rounded-md px-4 py-2 border text-sm sm:text-base order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto rounded-md px-4 py-2 bg-accent text-accent-foreground text-sm sm:text-base order-1 sm:order-2"
                  >
                    Save User
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role Summary Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Admin Card */}
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Administrators</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {users.filter((u) => u.role === "admin").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Manager Card */}
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <UserCog className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Managers</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {users.filter((u) => u.role === "manager").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Employee Card */}
          <Card className="shadow-soft border-0 sm:border sm:col-span-1 md:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                    <AvatarFallback className="bg-transparent text-muted-foreground text-xs sm:text-sm">
                      👤
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Employees</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {users.filter((u) => u.role === "employee").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                  Search Users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
              </div>
              
              {/* Role Filter */}
              <div className="w-full sm:w-48">
                <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                  Role
                </label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              System Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading users...
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="block sm:hidden space-y-3 p-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white rounded-lg border p-4 space-y-3">
                      {/* Header with Avatar and Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {user.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.id}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeactivate(user)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              {user.status === "inactive" ? "Activate" : "Deactivate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Role & Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`${roleClasses[user.role]} text-xs`} variant="secondary">
                          {user.role}
                        </Badge>
                        <Badge className={`${statusClasses[user.status]} text-xs`} variant="secondary">
                          {user.status}
                        </Badge>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      </div>

                      {/* Last Login & Created Date */}
                      <div className="flex flex-col gap-1 pt-1 border-t">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">Last: {user.lastLogin}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">Created: {user.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">No users found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search or add a new user
                      </p>
                    </div>
                  )}
                </div>

                {/* Tablet/Desktop View - Table */}
                <div className="hidden sm:block w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm w-[20%]">User</TableHead>
                        <TableHead className="text-xs md:text-sm w-[20%]">Email</TableHead>
                        <TableHead className="text-xs md:text-sm w-[12%]">Role</TableHead>
                        <TableHead className="text-xs md:text-sm w-[12%]">Status</TableHead>
                        <TableHead className="text-xs md:text-sm w-[15%]">Last Login</TableHead>
                        <TableHead className="text-xs md:text-sm w-[10%]">Created</TableHead>
                        <TableHead className="text-right text-xs md:text-sm w-[11%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                                  {user.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm md:text-base truncate max-w-[150px] lg:max-w-[200px]">
                                  {user.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{user.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm md:text-base text-muted-foreground truncate max-w-[200px] lg:max-w-[250px]">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${roleClasses[user.role]} text-xs md:text-sm`} variant="secondary">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusClasses[user.status]} text-xs md:text-sm`} variant="secondary">
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm md:text-base text-muted-foreground truncate max-w-[150px]">
                            {user.lastLogin}
                          </TableCell>
                          <TableCell className="text-sm md:text-base text-muted-foreground">
                            {user.createdAt}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeactivate(user)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {user.status === "inactive" ? "Activate" : "Deactivate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
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
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b">
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm sm:text-base">
                    {selectedUser.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-base sm:text-lg break-words">{selectedUser.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedUser.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Email</label>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words bg-muted/30 p-2 rounded">
                    {selectedUser.email}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Role</label>
                  <div>
                    <Badge className={`${roleClasses[selectedUser.role]} text-xs sm:text-sm`} variant="secondary">
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Status</label>
                  <div>
                    <Badge className={`${statusClasses[selectedUser.status]} text-xs sm:text-sm`} variant="secondary">
                      {selectedUser.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Created Date</label>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedUser.createdAt}</p>
                </div>
                
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Last Login</label>
                  <p className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                    {selectedUser.lastLogin}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 sm:mt-6">
            <Button onClick={() => setViewDetailsOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog - Responsive */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Edit User</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update user information
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form className="space-y-4 sm:space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                />
              </div>
              
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                />
              </div>
              
              {/* Role & Status */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs sm:text-sm font-medium">Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as User["role"] })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs sm:text-sm font-medium">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as User["status"] })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </form>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setEditUserOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveEditUser} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog - Responsive */}
      <Dialog open={changeRoleOpen} onOpenChange={setChangeRoleOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Change User Role</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Select a new role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 sm:p-4 rounded-md bg-muted space-y-1">
                <p className="text-xs sm:text-sm font-medium">Current Role</p>
                <Badge className={`${roleClasses[selectedUser.role]} text-xs sm:text-sm`} variant="secondary">
                  {selectedUser.role}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium mb-1.5">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as User["role"])}
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setChangeRoleOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmChangeRole} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate User Dialog - Responsive */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className={`text-base sm:text-lg ${selectedUser?.status === "inactive" ? "" : "text-destructive"}`}>
              {selectedUser?.status === "inactive" ? "Activate User" : "Deactivate User"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedUser?.status === "inactive"
                ? `Activate ${selectedUser?.name}? They will be able to access the system again.`
                : `Are you sure you want to deactivate ${selectedUser?.name}? They will no longer be able to access the system.`}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="p-3 sm:p-4 rounded-md bg-destructive/10 space-y-1">
              <p className="text-sm sm:text-base font-medium break-words">{selectedUser.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedUser.email}</p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setDeactivateOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            {selectedUser?.status === "inactive" ? (
              <Button 
                onClick={confirmActivate} 
                className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
              >
                Activate
              </Button>
            ) : (
              <Button 
                onClick={confirmDeactivate} 
                variant="destructive"
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Deactivate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog - Responsive */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">Delete User</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to permanently delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="p-3 sm:p-4 rounded-md bg-destructive/10 space-y-1">
              <p className="text-sm sm:text-base font-medium break-words">{selectedUser.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedUser.email}</p>
              <p className="text-xs text-muted-foreground break-words mt-1">{selectedUser.id}</p>
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
              onClick={confirmDeleteUser} 
              variant="destructive"
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Users;