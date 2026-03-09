import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/manger/ui/button";
import { Input } from "@/components/manger/ui/input";
import { Badge } from "@/components/manger/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/manger/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/manger/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/manger/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/manger/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/manger/ui/alert-dialog";
import { toast } from "@/components/manger/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  MoreHorizontal,
  Users,
  UserPlus,
  Briefcase,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/manger/utils";
import { apiFetch } from "@/lib/manger/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "away" | "offline";
  location: string;
  joinDate: string;
  avatar: string;
}

type EmployeeApi = Omit<Employee, "id"> & {
  _id: string;
};

function normalizeEmployee(e: EmployeeApi): Employee {
  return {
    id: e._id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    role: e.role,
    status: e.status,
    location: e.location,
    joinDate: e.joinDate,
    avatar: e.avatar,
  };
}

const statusColors = {
  active: "bg-success",
  away: "bg-warning",
  offline: "bg-muted-foreground",
};

const statusLabels = {
  active: "Online",
  away: "Away",
  offline: "Offline",
};

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  role: z.string().min(1, "Role is required"),
  status: z.enum(["active", "away", "offline"]),
  location: z.string().min(1, "Location is required"),
  joinDate: z.string().min(1, "Join date is required"),
});

type CreateEmployeeValues = z.infer<typeof createEmployeeSchema>;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "?" : "";
  return (first + last).toUpperCase();
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
};

const filterVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
      delay: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  }),
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: "0 20px 40px -15px rgba(0,0,0,0.2)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 30,
    transition: { duration: 0.2 },
  },
};

const statusDotVariants = {
  active: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "reverse",
    },
  },
  away: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "reverse",
    },
  },
  offline: {
    scale: 1,
  },
};

const iconVariants = {
  hover: {
    rotate: 15,
    scale: 1.1,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
};

const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  tap: {
    scale: 0.95,
  },
};

const statsVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      delay: 0.4,
    },
  },
};

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch<{ items: EmployeeApi[] }>("/api/employees");
      return res.items.map(normalizeEmployee);
    },
  });

  const employees = employeesQuery.data ?? [];

  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: Omit<Employee, "id">) => {
      const res = await apiFetch<{ item: EmployeeApi }>("/api/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return normalizeEmployee(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateEmployeeValues }) => {
      const nextPayload = {
        ...payload,
        avatar: getInitials(payload.name),
      };
      const res = await apiFetch<{ item: EmployeeApi }>(`/api/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(nextPayload),
      });
      return normalizeEmployee(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ ok: true }>(`/api/employees/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const form = useForm<CreateEmployeeValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "",
      status: "active",
      location: "",
      joinDate: "",
    },
  });

  const editForm = useForm<CreateEmployeeValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "",
      status: "active",
      location: "",
      joinDate: "",
    },
  });

  const onCreateEmployee = (values: CreateEmployeeValues) => {
    const payload: Omit<Employee, "id"> = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      role: values.role,
      status: values.status,
      location: values.location,
      joinDate: values.joinDate,
      avatar: getInitials(values.name),
    };

    createEmployeeMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
        toast({
          title: "Employee added",
          description: "New employee has been added to the directory.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to add employee",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  const openView = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    editForm.reset({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      status: employee.status,
      location: employee.location,
      joinDate: employee.joinDate,
    });
    setIsEditOpen(true);
  };

  const openDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteOpen(true);
  };

  const onEditEmployee = (values: CreateEmployeeValues) => {
    if (!selectedEmployee) return;
    updateEmployeeMutation.mutate(
      { id: selectedEmployee.id, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          toast({
            title: "Employee updated",
            description: "Employee profile has been updated.",
          });
        },
        onError: (err) => {
          toast({
            title: "Failed to update employee",
            description: err instanceof Error ? err.message : "Something went wrong",
          });
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!selectedEmployee) return;
    const toDelete = selectedEmployee;

    deleteEmployeeMutation.mutate(toDelete.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedEmployee(null);
        toast({
          title: "Employee deleted",
          description: "Employee has been removed from the directory.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to delete employee",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || employee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div 
        variants={headerVariants} 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="page-header mb-0">
          <motion.h1 
            className="page-title"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            Employee Directory
          </motion.h1>
          <motion.p 
            className="page-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            View and manage your team members
          </motion.p>
        </div>
        <motion.div
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Button>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={filterVariants} className="flex flex-col sm:flex-row gap-4">
        <motion.div 
          className="relative flex-1"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>
        <motion.div 
          className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.2 }
            }
          }}
        >
          <motion.div variants={itemVariants}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Online</SelectItem>
                <SelectItem value="away">Away</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Employee Grid */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
      >
        {employeesQuery.isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full p-6 text-sm text-muted-foreground flex items-center justify-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
            />
            Loading employees...
          </motion.div>
        ) : employeesQuery.isError ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full p-6 text-sm text-destructive"
          >
            {employeesQuery.error instanceof Error
              ? employeesQuery.error.message
              : "Failed to load employees"}
          </motion.div>
        ) : filteredEmployees.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full p-12 text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center"
            >
              <Users className="w-8 h-8" />
            </motion.div>
            <h3 className="text-lg font-medium text-foreground mb-2">No employees found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Get started by adding your first employee"}
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredEmployees.map((employee, index) => (
              <motion.div
                key={employee.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                whileHover="hover"
                layout
                className="bg-card rounded-xl border border-border shadow-card p-4 sm:p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <motion.div 
                      className="relative"
                      whileHover="hover"
                      variants={iconVariants}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                        {employee.avatar}
                      </div>
                      <motion.div
                        variants={statusDotVariants}
                        animate={employee.status}
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                          statusColors[employee.status]
                        )}
                      />
                    </motion.div>
                    <div className="min-w-0">
                      <motion.h3 
                        className="font-semibold text-foreground truncate"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.1 }}
                      >
                        {employee.name}
                      </motion.h3>
                      <motion.p 
                        className="text-sm text-muted-foreground truncate"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.15 }}
                      >
                        {employee.role}
                      </motion.p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Employee actions"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </motion.button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openView(employee)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(employee)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openDelete(employee)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  <motion.div 
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    whileHover="hover"
                    variants={iconVariants}
                  >
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{employee.email}</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    whileHover="hover"
                    variants={iconVariants}
                  >
                    <Phone className="w-4 h-4" />
                    <span className="truncate">{employee.phone}</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    whileHover="hover"
                    variants={iconVariants}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{employee.location}</span>
                  </motion.div>
                </motion.div>

                <motion.div 
                  className="flex items-center justify-between mt-4 pt-4 border-t border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  <motion.span
                    className={cn(
                      "text-xs font-medium flex items-center gap-1.5",
                      employee.status === "active"
                        ? "text-success"
                        : employee.status === "away"
                        ? "text-warning"
                        : "text-muted-foreground"
                    )}
                    animate={employee.status === "active" ? {
                      scale: [1, 1.05, 1],
                      transition: { duration: 2, repeat: Infinity }
                    } : {}}
                  >
                    <motion.span
                      variants={statusDotVariants}
                      animate={employee.status}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        statusColors[employee.status]
                      )}
                    />
                    {statusLabels[employee.status]}
                  </motion.span>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div 
        variants={statsVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-muted-foreground"
      >
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center sm:text-left"
        >
          Showing {filteredEmployees.length} of {employees.length} employees
        </motion.span>
        <motion.div 
          className="flex items-center justify-center sm:justify-end gap-4 overflow-x-auto pb-1 sm:pb-0"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.6 }
            }
          }}
        >
          <motion.span 
            variants={itemVariants}
            className="flex items-center gap-1.5"
          >
            <motion.span 
              className="w-2 h-2 rounded-full bg-success"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {employees.filter((e) => e.status === "active").length} online
          </motion.span>
          <motion.span 
            variants={itemVariants}
            className="flex items-center gap-1.5"
          >
            <motion.span 
              className="w-2 h-2 rounded-full bg-warning"
              animate={{ 
                opacity: [1, 0.5, 1],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            {employees.filter((e) => e.status === "away").length} away
          </motion.span>
          <motion.span 
            variants={itemVariants}
            className="flex items-center gap-1.5"
          >
            <motion.span 
              className="w-2 h-2 rounded-full bg-muted-foreground"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
            {employees.filter((e) => e.status === "offline").length} offline
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Dialogs - Keep existing dialog components with added animations */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add Employee
              </DialogTitle>
              <DialogDescription>
                Create a new employee profile for your team.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateEmployee)} className="space-y-4">
                {/* Form fields remain the same */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Employee name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@company.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Field Technician" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Online</SelectItem>
                            <SelectItem value="away">Away</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Main Office" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Join Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button type="submit" className="gap-2 w-full sm:w-auto">
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </motion.div>
                </DialogFooter>
              </form>
            </Form>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>View employee information.</DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <motion.div 
                  className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {selectedEmployee.avatar}
                </motion.div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {selectedEmployee.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedEmployee.role}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-muted-foreground">Email</p>
                  <p className="text-foreground break-all">{selectedEmployee.email}</p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <p className="text-muted-foreground">Phone</p>
                  <p className="text-foreground">{selectedEmployee.phone}</p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-muted-foreground">Location</p>
                  <p className="text-foreground">{selectedEmployee.location}</p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <p className="text-muted-foreground">Status</p>
                  <p className="text-foreground">{statusLabels[selectedEmployee.status]}</p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-muted-foreground">Join Date</p>
                  <p className="text-foreground">{new Date(selectedEmployee.joinDate).toLocaleDateString()}</p>
                </motion.div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto">
                  Close
                </Button>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    type="button"
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => {
                      if (!selectedEmployee) return;
                      setIsViewOpen(false);
                      openEdit(selectedEmployee);
                    }}
                  >
                    Edit
                  </Button>
                </motion.div>
              </DialogFooter>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee profile details.</DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditEmployee)} className="space-y-4">
              {/* Form fields remain the same as create form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Employee name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@company.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Field Technician" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Main Office" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Online</SelectItem>
                          <SelectItem value="away">Away</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Join Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button type="submit" className="w-full sm:w-auto">Save</Button>
                </motion.div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-[425px]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Delete employee?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the employee from the directory.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <AlertDialogAction onClick={confirmDelete} className="w-full sm:w-auto">Delete</AlertDialogAction>
              </motion.div>
            </AlertDialogFooter>
          </motion.div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// Helper variant for filter items
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
};