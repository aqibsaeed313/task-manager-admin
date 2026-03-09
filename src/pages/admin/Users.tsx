import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
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
  Sparkles,
  Users as UsersIcon,
  ArrowRight,
  AlertTriangle,
  Key,
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
import { createResource, deleteResource, listResource, updateResource, apiFetch } from "@/lib/admin/apiClient";
import { getAuthState } from "@/lib/auth";

interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: "super-admin" | "admin" | "manager";
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
  role: "super-admin" | "admin" | "manager";
  status?: "active" | "inactive" | "pending";
  createdAt?: string;
  updatedAt?: string;
};

// Enhanced color scheme with beautiful gradients
const roleClasses = {
  "super-admin": "bg-gradient-to-r from-slate-900/20 to-slate-900/10 text-slate-900 border-slate-900/20 shadow-sm",
  admin: "bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border-destructive/20 shadow-sm",
  manager: "bg-gradient-to-r from-[#6366f1]/20 to-[#8b5cf6]/20 text-[#6366f1] dark:text-[#a78bfa] border-[#6366f1]/20 shadow-sm",
};

const statusClasses = {
  active: "bg-gradient-to-r from-success/20 to-success/10 text-success border-success/20 shadow-sm",
  inactive: "bg-gradient-to-r from-muted to-muted/50 text-muted-foreground border-muted-foreground/20 shadow-sm",
  pending: "bg-gradient-to-r from-warning/20 to-warning/10 text-warning border-warning/20 shadow-sm",
};

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

const cardVariants: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
  hover: {
    scale: 1.02,
    boxShadow: "0 20px 25px -5px rgba(99, 102, 241, 0.1), 0 10px 10px -5px rgba(99, 102, 241, 0.04)",
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
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
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [newRole, setNewRole] = useState<User["role"]>("manager");
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "manager" as User["role"],
    status: "active" as User["status"],
  });

  useEffect(() => {
    // Check if current user is super-admin
    const auth = getAuthState();
    setIsSuperAdmin(auth.role === "super-admin");
  }, []);

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
    mode: "onChange",
    defaultValues: {
      name: "",
      password: "",
      email: "",
      role: "manager",
      status: "active",
    },
  });

  const {
    formState: { errors, isValid, isSubmitting },
  } = form;

  function getInitials(name: string) {
    return String(name || "")
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

  // Super Admin: Reset Password handlers
  const handleResetPassword = (user: User) => {
    if (!isSuperAdmin) return;
    setSelectedUser(user);
    setResetPasswordData({ newPassword: "", confirmPassword: "" });
    setResetPasswordOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedUser || !isSuperAdmin) return;
    
    // Validate passwords match
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setApiError("Passwords do not match");
      return;
    }
    
    // Validate password length
    if (resetPasswordData.newPassword.length < 6) {
      setApiError("Password must be at least 6 characters");
      return;
    }

    try {
      setResetPasswordLoading(true);
      setApiError(null);
      
      await apiFetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({
          newPassword: resetPasswordData.newPassword,
          confirmPassword: resetPasswordData.confirmPassword,
        }),
      });
      
      setResetPasswordOpen(false);
      setResetPasswordData({ newPassword: "", confirmPassword: "" });
      setSelectedUser(null);
      // Show success (you could add a success toast here)
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResetPasswordLoading(false);
    }
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
      <motion.div 
        className="space-y-4 sm:space-y-5 md:space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header with animated gradient */}
        <motion.div 
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </motion.div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  User Management
                </h1>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
                Manage system users, roles, and permissions with beautiful animations.
              </p>
            </div>

            {/* Add User Button with animation */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white w-full sm:w-auto mt-2 sm:mt-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="sm:hidden">Add User</span>
                    <span className="hidden sm:inline">Add New User</span>
                  </Button>
                </motion.div>
              </DialogTrigger>

              <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
                <DialogHeader className="space-y-1.5 sm:space-y-2">
                  <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Add New User
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Create a new system user and assign a role.
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mt-2 sm:mt-4 space-y-4 sm:space-y-5"
                >
                  <motion.div 
                    className="space-y-3 sm:space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium">Full name</label>
                      <input
                        {...form.register("name", {
                          required: "Full name is required",
                          minLength: { value: 2, message: "Full name must be at least 2 characters" },
                          validate: (v) => (String(v || "").trim() ? true : "Full name is required"),
                        })}
                        aria-invalid={!!errors.name}
                        className={
                          "w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all " +
                          (errors.name ? "border-destructive focus:ring-destructive/20" : "")
                        }
                        placeholder="Jane Doe"
                      />
                      {errors.name && (
                        <p className="text-xs text-destructive">{String(errors.name.message || "Invalid name")}</p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium">Email</label>
                      <input
                        {...form.register("email", {
                          required: "Email is required",
                          validate: (v) => (String(v || "").trim() ? true : "Email is required"),
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: "Enter a valid email address",
                          },
                        })}
                        aria-invalid={!!errors.email}
                        className={
                          "w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all " +
                          (errors.email ? "border-destructive focus:ring-destructive/20" : "")
                        }
                        placeholder="jane.doe@company.com"
                        type="email"
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{String(errors.email.message || "Invalid email")}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium">Password</label>
                      <input
                        {...form.register("password", {
                          required: "Password is required",
                          minLength: { value: 6, message: "Password must be at least 6 characters" },
                        })}
                        aria-invalid={!!errors.password}
                        className={
                          "w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all " +
                          (errors.password ? "border-destructive focus:ring-destructive/20" : "")
                        }
                        placeholder="Minimum 6 characters"
                        type="password"
                      />
                      {errors.password && (
                        <p className="text-xs text-destructive">{String(errors.password.message || "Invalid password")}</p>
                      )}
                    </div>
                    
                    {/* Role & Status */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-1.5">
                        <label className="block text-xs sm:text-sm font-medium">Role</label>
                        <select 
                          {...form.register("role", { required: "Role is required" })} 
                          aria-invalid={!!errors.role}
                          className={
                            "w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all " +
                            (errors.role ? "border-destructive focus:ring-destructive/20" : "")
                          }
                        >
                          <option value="super-admin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                        </select>
                        {errors.role && (
                          <p className="text-xs text-destructive">{String(errors.role.message || "Role is required")}</p>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="block text-xs sm:text-sm font-medium">Status</label>
                        <select 
                          {...form.register("status", { required: "Status is required" })} 
                          aria-invalid={!!errors.status}
                          className={
                            "w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all " +
                            (errors.status ? "border-destructive focus:ring-destructive/20" : "")
                          }
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                        </select>
                        {errors.status && (
                          <p className="text-xs text-destructive">{String(errors.status.message || "Status is required")}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                    <motion.button 
                      type="button" 
                      onClick={() => setOpen(false)} 
                      className="w-full sm:w-auto rounded-lg px-4 py-2 border text-sm sm:text-base order-2 sm:order-1 hover:bg-muted transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button 
                      type="submit" 
                      disabled={!isValid || isSubmitting}
                      className={
                        "w-full sm:w-auto rounded-lg px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-white text-sm sm:text-base order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300 " +
                        (!isValid || isSubmitting ? "opacity-60 cursor-not-allowed hover:shadow-lg" : "")
                      }
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Save User
                    </motion.button>

                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* API Error Message with animation */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="rounded-lg bg-destructive/10 p-3 sm:p-4 border border-destructive/20"
            >
              <p className="text-xs sm:text-sm text-destructive break-words flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {apiError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Role Summary Cards - Animated Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4"
          variants={containerVariants}
        >
          {[
            { role: "super-admin", icon: Shield, label: "Super Admins", color: "slate-900", gradient: "from-slate-900/20 to-slate-900/5" },
            { role: "admin", icon: Shield, label: "Administrators", color: "destructive", gradient: "from-destructive/20 to-destructive/5" },
            { role: "manager", icon: UserCog, label: "Managers", color: "[#6366f1]", gradient: "from-[#6366f1]/20 to-[#8b5cf6]/10" },
          ].map((item, index) => (
            <motion.div
              key={item.role}
              variants={itemVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
            >
              <Card className={`shadow-lg border-0 bg-gradient-to-br ${item.gradient} backdrop-blur-sm overflow-hidden`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <motion.div 
                      className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-${item.color}/10 flex items-center justify-center flex-shrink-0`}
                      whileHover={{ rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                      <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${item.color}`} />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.label}</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {users.filter((u) => u.role === item.role).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
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
                      className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base rounded-lg border-0 bg-muted/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                
                {/* Role Filter */}
                <div className="w-full sm:w-48">
                  <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                    Role
                  </label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-0 bg-muted/50 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="super-admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Users Table Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-muted/20">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-primary" />
                System Users
                {filteredUsers.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                    {filteredUsers.length} total
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {loading ? (
                <div className="flex justify-center items-center py-8 sm:py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
                  />
                </div>
              ) : (
                <>
                  {/* Mobile View - Animated Cards */}
                  <div className="block sm:hidden space-y-3 p-4">
                    <AnimatePresence>
                      {filteredUsers.map((user, index) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          className="bg-gradient-to-br from-card to-card/50 rounded-xl border p-4 space-y-3 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {/* Header with Avatar and Actions */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                              >
                                <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/20">
                                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-xs">
                                    {user.initials}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.id}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </motion.div>
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
                                {isSuperAdmin && (
                                  <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                    <Key className="mr-2 h-4 w-4" />
                                    Reset Password
                                  </DropdownMenuItem>
                                )}
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
                          <motion.div 
                            className="flex items-center gap-2"
                            whileHover={{ x: 5 }}
                          >
                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                          </motion.div>

                          {/* Last Login & Created Date */}
                          <div className="flex flex-col gap-1 pt-1 border-t">
                            <motion.div 
                              className="flex items-center gap-2"
                              whileHover={{ x: 5 }}
                            >
                              <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">Last: {user.lastLogin}</span>
                            </motion.div>
                            <motion.div 
                              className="flex items-center gap-2"
                              whileHover={{ x: 5 }}
                            >
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">Created: {user.createdAt}</span>
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {filteredUsers.length === 0 && (
                      <motion.div 
                        className="text-center py-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex justify-center mb-3">
                          <motion.div 
                            className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <UsersIcon className="h-6 w-6 text-muted-foreground" />
                          </motion.div>
                        </div>
                        <p className="text-sm text-muted-foreground">No users found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try adjusting your search or add a new user
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Tablet/Desktop View - Animated Table */}
                  <div className="hidden sm:block w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs md:text-sm w-[20%]">User</TableHead>
                          <TableHead className="text-xs md:text-sm w-[20%]">Email</TableHead>
                          <TableHead className="text-xs md:text-sm w-[12%]">Role</TableHead>
                          <TableHead className="text-xs md:text-sm w-[12%]">Status</TableHead>
                          <TableHead className="text-xs md:text-sm w-[15%]">Created</TableHead>
                          <TableHead className="text-right text-xs md:text-sm w-[15%]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredUsers.map((user, index) => (
                            <motion.tr
                              key={user.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ 
                                scale: 1.01,
                                backgroundColor: "rgba(99, 102, 241, 0.05)",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                              }}
                              className="cursor-pointer transition-all duration-300"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                                  >
                                    <Avatar className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0 ring-2 ring-primary/20">
                                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-xs md:text-sm">
                                        {user.initials}
                                      </AvatarFallback>
                                    </Avatar>
                                  </motion.div>
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
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Badge className={`${roleClasses[user.role]} text-xs md:text-sm`} variant="secondary">
                                    {user.role}
                                  </Badge>
                                </motion.div>
                              </TableCell>
                              <TableCell>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Badge className={`${statusClasses[user.status]} text-xs md:text-sm`} variant="secondary">
                                    {user.status}
                                  </Badge>
                                </motion.div>
                              </TableCell>
                              <TableCell className="text-sm md:text-base text-muted-foreground">
                                {user.createdAt}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </motion.div>
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
                                    {isSuperAdmin && (
                                      <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                        <Key className="mr-2 h-4 w-4" />
                                        Reset Password
                                      </DropdownMenuItem>
                                    )}
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
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

      {/* View Details Dialog - Animated */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              User Details
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <motion.div 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-sm sm:text-base">
                      {selectedUser.initials}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div className="min-w-0">
                  <p className="font-semibold text-base sm:text-lg break-words">{selectedUser.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedUser.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Email</label>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words bg-muted/30 p-2 rounded-lg">
                    {selectedUser.email}
                  </p>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Role</label>
                  <div>
                    <Badge className={`${roleClasses[selectedUser.role]} text-xs sm:text-sm`} variant="secondary">
                      {selectedUser.role}
                    </Badge>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Status</label>
                  <div>
                    <Badge className={`${statusClasses[selectedUser.status]} text-xs sm:text-sm`} variant="secondary">
                      {selectedUser.status}
                    </Badge>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Created Date</label>
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedUser.createdAt}</p>
                </motion.div>
              </div>
            </motion.div>
          )}
          <DialogFooter className="mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button onClick={() => setViewDetailsOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog - Animated */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Edit User
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update user information
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <motion.form 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              
              {/* Role & Status */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs sm:text-sm font-medium">Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as User["role"] })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="super-admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs sm:text-sm font-medium">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as User["status"] })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </motion.form>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="outline" 
                onClick={() => setEditUserOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                onClick={saveEditUser} 
                className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Save Changes
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog - Animated */}
      <Dialog open={changeRoleOpen} onOpenChange={setChangeRoleOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Change User Role
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Select a new role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-muted to-muted/50 space-y-1">
                <p className="text-xs sm:text-sm font-medium">Current Role</p>
                <Badge className={`${roleClasses[selectedUser.role]} text-xs sm:text-sm`} variant="secondary">
                  {selectedUser.role}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium mb-1.5">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as User["role"]) }
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="super-admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </motion.div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="outline" 
                onClick={() => setChangeRoleOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                onClick={confirmChangeRole} 
                className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Update Role
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate User Dialog - Animated */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className={`text-base sm:text-lg ${selectedUser?.status === "inactive" ? "text-primary" : "text-destructive"}`}>
              {selectedUser?.status === "inactive" ? "Activate User" : "Deactivate User"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedUser?.status === "inactive"
                ? `Activate ${selectedUser?.name}? They will be able to access the system again.`
                : `Are you sure you want to deactivate ${selectedUser?.name}? They will no longer be able to access the system.`}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <motion.div 
              className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-destructive/10 to-destructive/5 space-y-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-sm sm:text-base font-medium break-words">{selectedUser.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedUser.email}</p>
            </motion.div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="outline" 
                onClick={() => setDeactivateOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </motion.div>
            {selectedUser?.status === "inactive" ? (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Button 
                  onClick={confirmActivate} 
                  className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Activate
                </Button>
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Button 
                  onClick={confirmDeactivate} 
                  variant="destructive"
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  Deactivate
                </Button>
              </motion.div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog - Animated */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">Delete User</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to permanently delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <motion.div 
              className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-destructive/10 to-destructive/5 space-y-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-sm sm:text-base font-medium break-words">{selectedUser.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedUser.email}</p>
              <p className="text-xs text-muted-foreground break-words mt-1">{selectedUser.id}</p>
            </motion.div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="outline" 
                onClick={() => setDeleteOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                onClick={confirmDeleteUser} 
                variant="destructive"
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Delete User
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog - Super Admin Only */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Reset User Password
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Set a new password for {selectedUser?.name}. This action is only available to Super Admins.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <motion.div 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* User Info */}
              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-muted to-muted/50 space-y-1">
                <p className="text-sm sm:text-base font-medium">{selectedUser.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium">New Password</label>
                <input
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </motion.div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="outline" 
                onClick={() => {
                  setResetPasswordOpen(false);
                  setResetPasswordData({ newPassword: "", confirmPassword: "" });
                }}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                onClick={confirmResetPassword}
                disabled={resetPasswordLoading || !resetPasswordData.newPassword || !resetPasswordData.confirmPassword}
                className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60"
              >
                {resetPasswordLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add global styles for grid pattern */}
      <style>{`
        .bg-grid-white {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
        }
      `}</style>
      </motion.div>
    </AdminLayout>
  );
};

export default Users;