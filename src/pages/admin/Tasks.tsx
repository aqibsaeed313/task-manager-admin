import { useEffect, useMemo, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/admin/ui/command";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Clock,
  User,
  Calendar,
  FileText,
  Printer,
  Check,
  ChevronsUpDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
} from "lucide-react";
import jsPDF from "jspdf";
import { apiFetch, createResource, deleteResource, listResource, updateResource } from "@/lib/admin/apiClient";

interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  assignee?: string;
  assigneeInitials?: string;
  location?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "overdue";
  dueDate: string;
  dueTime: string;
  createdAt: string;
  attachmentFileName?: string;
  attachmentNote?: string;
  attachment?: {
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
  };
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

// Enhanced priority classes with beautiful gradients
const priorityClasses = {
  high: "bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border-destructive/20 shadow-sm",
  medium: "bg-gradient-to-r from-[#eab308]/20 to-[#f59e0b]/20 text-[#eab308] dark:text-[#fbbf24] border-[#eab308]/20 shadow-sm",
  low: "bg-gradient-to-r from-[#22c55e]/20 to-[#10b981]/20 text-[#22c55e] dark:text-[#34d399] border-[#22c55e]/20 shadow-sm",
};

const toDateOnly = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "";
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
};

const getInitials = (name: string) => {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const assigneesLabel = (assignees: string[]) => {
  return (assignees || []).filter(Boolean).join(", ");
};

const normalizeTaskAssignees = (task: Task): Task => {
  const legacyAssignee = typeof task.assignee === "string" ? task.assignee.trim() : "";
  const assignees = Array.isArray(task.assignees)
    ? task.assignees.filter(Boolean)
    : legacyAssignee
      ? [legacyAssignee]
      : [];
  return { ...task, assignees };
};

// Enhanced status classes with beautiful gradients
const statusClasses = {
  pending: "bg-gradient-to-r from-muted to-muted/50 text-muted-foreground border-muted-foreground/20 shadow-sm",
  "in-progress": "bg-gradient-to-r from-[#3b82f6]/20 to-[#6366f1]/20 text-[#3b82f6] dark:text-[#818cf8] border-[#3b82f6]/20 shadow-sm",
  completed: "bg-gradient-to-r from-[#22c55e]/20 to-[#10b981]/20 text-[#22c55e] dark:text-[#34d399] border-[#22c55e]/20 shadow-sm",
  overdue: "bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border-destructive/20 shadow-sm",
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
    boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)",
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
};

const Tasks = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tasksList, setTasksList] = useState<Task[]>(() => []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [editAssigneesOpen, setEditAssigneesOpen] = useState(false);
  const [reassignAssigneesOpen, setReassignAssigneesOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    assignees: [] as string[],
    priority: "medium" as Task["priority"],
    status: "pending" as Task["status"],
    dueDate: "",
    dueTime: "",
    attachmentFileName: "",
    attachmentNote: "",
  });

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignees: [] as string[],
    priority: "medium" as Task["priority"],
    status: "pending" as Task["status"],
    dueDate: "",
    dueTime: "",
    attachmentFileName: "",
    attachmentNote: "",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);

        // Fetch tasks
        const taskList = await listResource<Task>("tasks");
        if (!mounted) return;
        setTasksList(taskList.map(normalizeTaskAssignees));

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
        setApiError(e instanceof Error ? e.message : "Failed to load data");
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

  const refreshTasks = async () => {
    const list = await listResource<Task>("tasks");
    setTasksList(list.map(normalizeTaskAssignees));
  };

  const displayIdByTaskId = useMemo(() => {
    return new Map(
      tasksList.map((t, idx) => {
        const displayId = `TSK${String(idx + 1).padStart(3, "0")}`;
        return [t.id, displayId] as const;
      }),
    );
  }, [tasksList]);

  const getDisplayTaskId = (taskId: string) => {
    return displayIdByTaskId.get(taskId) || taskId;
  };

  const handleCreateTask = async () => {
    if (!formData.title || formData.assignees.length === 0 || !formData.dueDate) return;
    try {
      setApiError(null);
      const newTask: Task = {
        id: `TSK-${Date.now().toString().slice(-6)}`,
        title: formData.title,
        description: formData.description,
        assignees: formData.assignees,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        createdAt: new Date().toISOString().split("T")[0],
        attachmentFileName: formData.attachmentFileName || "",
        attachmentNote: formData.attachmentNote || "",
      };
      if (attachmentFile) {
        console.log("Uploading file:", attachmentFile.name, "Size:", attachmentFile.size);
        const fd = new FormData();
        fd.append("title", formData.title);
        fd.append("description", formData.description);
        fd.append("assignees", JSON.stringify(formData.assignees));
        fd.append("priority", formData.priority);
        fd.append("status", formData.status);
        fd.append("dueDate", formData.dueDate);
        fd.append("dueTime", formData.dueTime);
        fd.append("createdAt", newTask.createdAt);

        fd.append("attachmentFileName", attachmentFile.name);
        fd.append("attachmentNote", formData.attachmentNote);
        fd.append("file", attachmentFile);

        try {
          const response = await apiFetch<{ item: Task }>("/api/tasks/upload", {
            method: "POST",
            body: fd,
          });
          console.log("Upload response:", response);
        } catch (uploadErr) {
          console.error("Upload failed:", uploadErr);
          throw new Error("File upload failed: " + (uploadErr instanceof Error ? uploadErr.message : "Unknown error"));
        }
      } else {
        await createResource<Task>("tasks", newTask);
      }
      await refreshTasks();
      setCreateTaskOpen(false);
      setFormData({
        title: "",
        description: "",
        assignees: [],
        priority: "medium",
        status: "pending",
        dueDate: "",
        dueTime: "",
        attachmentFileName: "",
        attachmentNote: "",
      });
      setAttachmentFile(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to create task");
    }
  };

  const handleViewDetails = (task: Task) => {
    setEditTaskOpen(false);
    setReassignOpen(false);
    setSelectedTask(normalizeTaskAssignees(task));
    setViewDetailsOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setViewDetailsOpen(false);
    setReassignOpen(false);
    setSelectedTask(task);
    setEditFormData({
      title: task.title,
      description: task.description,
      assignees: task.assignees || [],
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      attachmentFileName: task.attachmentFileName || "",
      attachmentNote: task.attachmentNote || "",
    });
    setEditTaskOpen(true);
  };

  const handleReassign = (task: Task) => {
    setViewDetailsOpen(false);
    setEditTaskOpen(false);
    setSelectedTask(task);
    setEditFormData((prev) => ({ ...prev, assignees: task.assignees || [] }));
    setReassignOpen(true);
  };

  const handleDeleteConfirm = (task: Task) => {
    setSelectedTask(task);
    setDeleteConfirmOpen(true);
  };

  const saveEditTask = async () => {
    if (!selectedTask) return;
    try {
      setApiError(null);
      await updateResource<Task>("tasks", selectedTask.id, {
        ...selectedTask,
        title: editFormData.title,
        description: editFormData.description,
        assignees: editFormData.assignees,
        priority: editFormData.priority,
        status: editFormData.status,
        dueDate: editFormData.dueDate,
        dueTime: editFormData.dueTime,
        attachmentFileName: editFormData.attachmentFileName || "",
        attachmentNote: editFormData.attachmentNote || "",
      });

      await refreshTasks();
      setEditTaskOpen(false);
      setSelectedTask(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update task");
    }
  };

  const saveReassign = async () => {
    if (!selectedTask) return;
    try {
      setApiError(null);
      await updateResource<Task>("tasks", selectedTask.id, {
        ...selectedTask,
        assignees: editFormData.assignees,
      });
      await refreshTasks();
      setReassignOpen(false);
      setSelectedTask(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to reassign task");
    }
  };

  const confirmDelete = async () => {
    if (!selectedTask) return;
    try {
      setApiError(null);
      await deleteResource("tasks", selectedTask.id);
      await refreshTasks();
      setDeleteConfirmOpen(false);
      setSelectedTask(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to delete task");
    }
  };

  const filteredTasks = tasksList.filter((task) => {
    const assigneesText = Array.isArray(task.assignees) ? task.assignees.join(" ") : "";
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assigneesText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "in-progress":
        return <AlertCircle className="h-3 w-3" />;
      case "completed":
        return <CheckCircle2 className="h-3 w-3" />;
      case "overdue":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handlePrintTask = async (task: Task) => {
    try {
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const maxWidth = pageWidth - margin * 2;

      let y = margin;

      const addHeading = (text: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        const lines = doc.splitTextToSize(text || "—", maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 18 + 6;
      };

      const addLabelValue = (label: string, value: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`${label}:`, margin, y);
        doc.setFont("helvetica", "normal");
        const valLines = doc.splitTextToSize(value || "—", maxWidth - 80);
        doc.text(valLines, margin + 80, y);
        y += valLines.length * 14 + 6;
      };

      const ensureSpace = (needed: number) => {
        if (y + needed <= pageHeight - margin) return;
        doc.addPage();
        y = margin;
      };

      addHeading(task.title || "Task");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Assigned to: ${(task.assignees || []).join(", ") || "—"}`, margin, y);
      y += 18;

      ensureSpace(120);
      addLabelValue("Status", task.status || "—");
      addLabelValue("Priority", task.priority || "—");
      addLabelValue("Due Date", toDateOnly(task.dueDate) || "—");
      addLabelValue("Due Time", task.dueTime || "—");

      ensureSpace(80);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Description", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const descLines = doc.splitTextToSize(task.description || "—", maxWidth);
      doc.text(descLines, margin, y);
      y += descLines.length * 14 + 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      ensureSpace(30);
      doc.text("Attachment", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const attUrl = String(task.attachment?.url || "").trim();
      const attMime = String(task.attachment?.mimeType || "").trim();
      const attIsImage = !!attUrl && (attMime.startsWith("image/") || attUrl.startsWith("data:image/"));
      const attName = task.attachment?.fileName || task.attachmentFileName || "";

      if (attIsImage) {
        const img = new Image();
        img.src = attUrl;
        await new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });

        const imgW = img.naturalWidth || 1;
        const imgH = img.naturalHeight || 1;

        const renderW = maxWidth;
        const renderH = (imgH / imgW) * renderW;

        ensureSpace(Math.min(renderH + 10, pageHeight - margin * 2));

        const type = attMime.includes("png") || attUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(attUrl, type as any, margin, y, renderW, renderH);
        y += renderH + 10;
      } else if (attName) {
        const attLines = doc.splitTextToSize(attName, maxWidth);
        doc.text(attLines, margin, y);
        y += attLines.length * 14 + 6;
      } else {
        doc.text("—", margin, y);
        y += 18;
      }

      if (task.attachmentNote) {
        ensureSpace(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Attachment Note", margin, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const noteLines = doc.splitTextToSize(task.attachmentNote, maxWidth);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 14 + 6;
      }

      const safeName = String(task.title || "task")
        .trim()
        .replace(/[\\/:*?\"<>|]+/g, "-")
        .slice(0, 80);
      doc.save(`${safeName || "task"}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
      setApiError(e instanceof Error ? e.message : "Failed to generate PDF");
    }
  };

  return (
    <AdminLayout>
      <motion.div
        className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0 pb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header with animated gradient */}
        <motion.div
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </motion.div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Task Management
                </h1>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
                Create, assign, and track all tasks.
              </p>
            </div>

            {/* API Error Message */}
            <AnimatePresence>
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
                  className="rounded-lg bg-destructive/10 p-3 sm:p-4 w-full sm:w-auto border border-destructive/20"
                >
                  <p className="text-xs sm:text-sm text-destructive break-words flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {apiError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Create Task Dialog */}
            <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white w-full sm:w-auto mt-2 sm:mt-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="sm:hidden">Create</span>
                    <span className="hidden sm:inline">Create Task</span>
                  </Button>
                </motion.div>
              </DialogTrigger>

              <DialogContent
                className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
              >
                <DialogHeader className="space-y-1.5 sm:space-y-2">
                  <DialogTitle
                    className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
                  >
                    Create New Task
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Create and assign a new task to team members
                  </DialogDescription>
                </DialogHeader>

                <motion.form
                  className="space-y-4 sm:space-y-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Task Title */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., HVAC Filter Replacement"
                      className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Provide task details..."
                      className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base min-h-[80px] sm:min-h-24 resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Assignees */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">
                        Assignees *
                      </label>
                      <Popover open={assigneesOpen} onOpenChange={setAssigneesOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between h-10"
                          >
                            <span className="truncate">
                              {formData.assignees.length > 0
                                ? formData.assignees.join(", ")
                                : "Select assignees"}
                            </span>
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search employees..." />
                            <CommandList>
                              <CommandEmpty>No employee found.</CommandEmpty>
                              <CommandGroup>
                                {employees.map((emp) => {
                                  const isSelected = formData.assignees.includes(emp.name);
                                  return (
                                    <CommandItem
                                      key={emp.id}
                                      onSelect={() => {
                                        const next = isSelected
                                          ? formData.assignees.filter((n) => n !== emp.name)
                                          : [...formData.assignees, emp.name];
                                        setFormData({ ...formData, assignees: next });
                                      }}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="truncate">{emp.name}</span>
                                      <Check className={"h-4 w-4 " + (isSelected ? "opacity-100" : "opacity-0")} />
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {employees.length === 0 && (
                        <p className="text-xs text-warning mt-1">
                          No employees found. Check console for errors.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task["priority"] })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Task["status"] })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Due Date *</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Due Time */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Due Time</label>
                    <input
                      type="time"
                      value={formData.dueTime}
                      onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Attachment File Name & Note */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Attachment</label>
                      <motion.div
                        className="w-full rounded-lg border px-3 py-3 text-sm sm:text-base bg-gradient-to-br from-muted/20 to-muted/5 hover:from-muted/30 hover:to-muted/10 transition-all cursor-pointer"
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const f = e.dataTransfer.files?.[0];
                          if (f) {
                            setAttachmentFile(f);
                            setFormData({ ...formData, attachmentFileName: f.name });
                          }
                        }}
                        onClick={() => {
                          const el = document.getElementById("task-attachment-input") as HTMLInputElement | null;
                          el?.click();
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            const el = document.getElementById("task-attachment-input") as HTMLInputElement | null;
                            el?.click();
                          }
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">
                              {attachmentFile ? attachmentFile.name : "Click to choose or drag & drop a file"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              Max 10MB
                            </p>
                          </div>
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <input
                          id="task-attachment-input"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setAttachmentFile(f);
                            setFormData({ ...formData, attachmentFileName: f?.name || "" });
                          }}
                        />
                      </motion.div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Attachment Note</label>
                      <input
                        type="text"
                        value={formData.attachmentNote}
                        onChange={(e) => setFormData({ ...formData, attachmentNote: e.target.value })}
                        placeholder="e.g., before/after photo"
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                </motion.form>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      variant="outline" 
                      onClick={() => setCreateTaskOpen(false)}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={handleCreateTask} 
                      className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                      Create Task
                    </Button>
                  </motion.div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Task Summary Cards - Animated */}
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
          variants={containerVariants}
        >
          {[
            { label: "Total Tasks", value: tasksList.length, icon: FileText, color: "primary" },
            { label: "In Progress", value: tasksList.filter(t => t.status === "in-progress").length, icon: AlertCircle, color: "[#3b82f6]" },
            { label: "Completed", value: tasksList.filter(t => t.status === "completed").length, icon: CheckCircle2, color: "[#22c55e]" },
            { label: "Overdue", value: tasksList.filter(t => t.status === "overdue").length, icon: AlertTriangle, color: "destructive" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              variants={itemVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
            >
              <Card className={`shadow-lg border-0 bg-gradient-to-br from-${item.color}/10 to-${item.color}/5 backdrop-blur-sm overflow-hidden`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <motion.div 
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-${item.color}/10 flex items-center justify-center flex-shrink-0`}
                      whileHover={{ rotate: 10 }}
                      transition={{ type: "spring" as const, stiffness: 300, damping: 10 }}
                    >
                      <item.icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${item.color}`} />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.label}</p>
                      <p className="text-lg sm:text-xl font-bold">{item.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters Card - Animated */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Search - Full width on mobile */}
                <div className="relative w-full">
                  <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                    Search Tasks
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title or assignee..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base rounded-lg border-0 bg-muted/50 focus:ring-2 focus:ring-primary/20 transition-all"
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
                      <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-0 bg-muted/50 focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                      Priority
                    </label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-0 bg-muted/50 focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-muted/20">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                All Tasks
                {filteredTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                    {filteredTasks.length} tasks
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {loading ? (
                <div className="flex justify-center items-center py-8 sm:py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
                  />
                </div>
              ) : (
                <>
                  {/* Mobile View - Cards */}
                  <div className="block sm:hidden space-y-3 p-4">
                    <AnimatePresence>
                      {filteredTasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          onHoverStart={() => setHoveredTask(task.id)}
                          onHoverEnd={() => setHoveredTask(null)}
                          className="bg-gradient-to-br from-card to-card/50 rounded-xl border p-4 space-y-3 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {/* Header with ID and Actions */}
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                {getDisplayTaskId(task.id)}
                                {hoveredTask === task.id && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="inline-block w-1.5 h-1.5 bg-primary rounded-full"
                                  />
                                )}
                              </p>
                              <h4 className="font-medium text-sm mt-1">{task.title}</h4>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(task);
                                }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  void handlePrintTask(task);
                                }}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTask(task);
                                }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Task
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleReassign(task);
                                }}>
                                  <User className="mr-2 h-4 w-4" />
                                  Reassign
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConfirm(task);
                                }} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Badge className={`${priorityClasses[task.priority]} text-xs`} variant="secondary">
                                {task.priority}
                              </Badge>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Badge className={`${statusClasses[task.status]} text-xs flex items-center gap-1`} variant="secondary">
                                {getStatusIcon(task.status)}
                                {task.status}
                              </Badge>
                            </motion.div>
                          </div>

                          {/* Description (if exists) */}
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Assignees */}
                          <motion.div 
                            className="flex items-start gap-2"
                            whileHover={{ x: 5 }}
                          >
                            <div className="h-4 w-4 flex-shrink-0 mt-0.5">
                              <Avatar className="h-4 w-4 ring-2 ring-primary/20">
                                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-[10px]">
                                  {getInitials(task.assignees?.[0] || "")}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div>
                              <p className="text-xs font-medium">Assignees</p>
                              <p className="text-sm">{assigneesLabel(task.assignees) || "—"}</p>
                            </div>
                          </motion.div>

                          {/* Due Date & Time */}
                          <motion.div 
                            className="flex items-start gap-2"
                            whileHover={{ x: 5 }}
                          >
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium">Due</p>
                              <p className="text-sm">{toDateOnly(task.dueDate)}{task.dueTime ? ` at ${task.dueTime}` : ""}</p>
                            </div>
                          </motion.div>

                          {/* Attachment (if exists) */}
                          {task.attachmentFileName && (
                            <motion.div 
                              className="pt-2 border-t"
                              whileHover={{ x: 5 }}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {task.attachmentFileName}
                                </span>
                              </div>
                              {task.attachmentNote && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.attachmentNote}
                                </p>
                              )}
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {filteredTasks.length === 0 && (
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
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </motion.div>
                        </div>
                        <p className="text-sm text-muted-foreground">No tasks found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try adjusting your filters or create a new task
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Desktop View - Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[100px]">Task ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Assignees</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead className="text-right">Print</TableHead>
                          <TableHead className="text-right w-[50px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredTasks.map((task, index) => (
                            <motion.tr
                              key={task.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ 
                                scale: 1.01,
                                backgroundColor: "rgba(59, 130, 246, 0.05)",
                                transition: { type: "spring", stiffness: 400, damping: 17 }
                              }}
                              className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleViewDetails(task)}
                            >
                              <TableCell className="font-mono text-xs md:text-sm">
                                <div className="flex items-center gap-2">
                                  {getDisplayTaskId(task.id)}
                                  {hoveredTask === task.id && (
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="inline-block w-1.5 h-1.5 bg-primary rounded-full"
                                    />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-xs md:text-sm max-w-[200px] truncate">
                                {task.title}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                                  >
                                    <Avatar className="h-6 w-6 ring-2 ring-primary/20">
                                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-xs">
                                        {getInitials(task.assignees?.[0] || "")}
                                      </AvatarFallback>
                                    </Avatar>
                                  </motion.div>
                                  <span className="text-xs md:text-sm truncate max-w-[150px]">
                                    {assigneesLabel(task.assignees)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Badge className={`${priorityClasses[task.priority]} text-xs md:text-sm`} variant="secondary">
                                    {task.priority}
                                  </Badge>
                                </motion.div>
                              </TableCell>
                              <TableCell>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Badge className={`${statusClasses[task.status]} text-xs md:text-sm flex items-center gap-1`} variant="secondary">
                                    {getStatusIcon(task.status)}
                                    {task.status}
                                  </Badge>
                                </motion.div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-xs md:text-sm">
                                  <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span>{task.dueTime}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{toDateOnly(task.dueDate)}</p>
                              </TableCell>
                              <TableCell className="text-right">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handlePrintTask(task);
                                    }}
                                  >
                                    <Printer className="h-4 w-4" />
                                    Print
                                  </Button>
                                </motion.div>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </motion.div>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetails(task);
                                    }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      void handlePrintTask(task);
                                    }}>
                                      <Printer className="mr-2 h-4 w-4" />
                                      Print
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTask(task);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Task
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleReassign(task);
                                    }}>
                                      <User className="mr-2 h-4 w-4" />
                                      Reassign
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteConfirm(task);
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                        
                        {filteredTasks.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <motion.div 
                                className="flex flex-col items-center justify-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <div className="flex justify-center mb-3">
                                  <motion.div 
                                    className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                  </motion.div>
                                </div>
                                <p className="text-sm text-muted-foreground">No tasks found</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Try adjusting your filters or create a new task
                                </p>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* View Details Dialog - Animated */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Task Details
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <motion.div 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="pb-4 border-b">
                <p className="text-xs sm:text-sm text-muted-foreground">{getDisplayTaskId(selectedTask.id)}</p>
                <p className="text-base sm:text-xl font-semibold break-words mt-1">{selectedTask.title}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <motion.div 
                  className="sm:col-span-2 space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Description</label>
                  <p className="text-xs sm:text-sm text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/10 p-2 sm:p-3 rounded-lg">
                    {selectedTask.description || "—"}
                  </p>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Assignees</label>
                  <div className="flex items-center gap-2">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                      <Avatar className="h-5 w-5 sm:h-6 sm:w-6 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-[10px] sm:text-xs">
                          {getInitials(selectedTask.assignees?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <span className="text-xs sm:text-sm">{assigneesLabel(selectedTask.assignees) || "—"}</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Priority</label>
                  <div>
                    <Badge className={`${priorityClasses[selectedTask.priority]} text-xs sm:text-sm`} variant="secondary">
                      {selectedTask.priority}
                    </Badge>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Status</label>
                  <div>
                    <Badge className={`${statusClasses[selectedTask.status]} text-xs sm:text-sm flex items-center gap-1`} variant="secondary">
                      {getStatusIcon(selectedTask.status)}
                      {selectedTask.status}
                    </Badge>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Due Date & Time</label>
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>{toDateOnly(selectedTask.dueDate)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedTask.dueTime || "—"}</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="sm:col-span-2 space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Attachment</label>
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 p-2 sm:p-3 rounded-lg space-y-2">
                    {selectedTask.attachment?.url ? (
                      <>
                        {/* Image Preview */}
                        {selectedTask.attachment.mimeType?.startsWith("image/") ? (
                          <div className="w-full overflow-hidden rounded-lg border bg-white">
                            <img
                              src={selectedTask.attachment.url}
                              alt={selectedTask.attachment.fileName || "Attachment"}
                              className="w-full h-auto max-h-64 object-contain"
                            />
                          </div>
                        ) : null}
                        
                        {/* File Info & Download */}
                        <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                          <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">
                              {selectedTask.attachment.fileName || selectedTask.attachmentFileName || "Attachment"}
                            </p>
                            {selectedTask.attachment.size > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {(selectedTask.attachment.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                          <a
                            href={selectedTask.attachment.url}
                            download={selectedTask.attachment.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            View / Download
                          </a>
                        </div>
                      </>
                    ) : selectedTask.attachmentFileName ? (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{selectedTask.attachmentFileName}</span>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground">—</p>
                    )}
                    
                    {selectedTask.attachmentNote && (
                      <p className="text-xs sm:text-sm text-muted-foreground break-words border-t pt-2 mt-2">
                        <span className="font-medium">Note:</span> {selectedTask.attachmentNote}
                      </p>
                    )}
                  </div>
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

      {/* Edit Task Dialog - Animated */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Edit Task
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update task information and save changes
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <motion.form 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Task Title */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5">Task Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base min-h-[80px] sm:min-h-24 resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5">Assignees</label>
                <Popover open={editAssigneesOpen} onOpenChange={setEditAssigneesOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-10"
                    >
                      <span className="truncate">
                        {editFormData.assignees.length > 0
                          ? editFormData.assignees.join(", ")
                          : "Select assignees"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search employees..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {employees.map((emp) => {
                            const isSelected = editFormData.assignees.includes(emp.name);
                            return (
                              <CommandItem
                                key={emp.id}
                                onSelect={() => {
                                  const next = isSelected
                                    ? editFormData.assignees.filter((n) => n !== emp.name)
                                    : [...editFormData.assignees, emp.name];
                                  setEditFormData({ ...editFormData, assignees: next });
                                }}
                                className="flex items-center justify-between"
                              >
                                <span className="truncate">{emp.name}</span>
                                <Check className={"h-4 w-4 " + (isSelected ? "opacity-100" : "opacity-0")} />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority, Status, Due Date */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as Task["priority"] })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as Task["status"] })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Due Time */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5">Due Time</label>
                <input
                  type="time"
                  value={editFormData.dueTime}
                  onChange={(e) => setEditFormData({ ...editFormData, dueTime: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Attachment File Name & Note */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Attachment File Name</label>
                  <input
                    type="text"
                    value={editFormData.attachmentFileName}
                    onChange={(e) => setEditFormData({ ...editFormData, attachmentFileName: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Attachment Note</label>
                  <input
                    type="text"
                    value={editFormData.attachmentNote}
                    onChange={(e) => setEditFormData({ ...editFormData, attachmentNote: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                  />
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
                onClick={() => setEditTaskOpen(false)}
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
                onClick={saveEditTask} 
                className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Save Changes
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Task Dialog - Animated */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Reassign Task
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Change the task assignees
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 p-3 sm:p-4 space-y-1">
                <p className="text-xs sm:text-sm font-medium">Task</p>
                <p className="text-sm sm:text-base">{selectedTask.title}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 p-3 sm:p-4 space-y-1">
                <p className="text-xs sm:text-sm font-medium">Current Assignees</p>
                <div className="flex items-center gap-2 mt-1">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <Avatar className="h-5 w-5 sm:h-6 sm:w-6 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-[10px] sm:text-xs">
                        {getInitials(selectedTask.assignees?.[0] || "")}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <span className="text-xs sm:text-sm">{assigneesLabel(selectedTask.assignees) || "—"}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium mb-1.5">New Assignees</label>
                <Popover open={reassignAssigneesOpen} onOpenChange={setReassignAssigneesOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-10"
                    >
                      <span className="truncate">
                        {editFormData.assignees.length > 0
                          ? editFormData.assignees.join(", ")
                          : "Select assignees"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search employees..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {employees.map((emp) => {
                            const isSelected = editFormData.assignees.includes(emp.name);
                            return (
                              <CommandItem
                                key={emp.id}
                                onSelect={() => {
                                  const next = isSelected
                                    ? editFormData.assignees.filter((n) => n !== emp.name)
                                    : [...editFormData.assignees, emp.name];
                                  setEditFormData({ ...editFormData, assignees: next });
                                }}
                                className="flex items-center justify-between"
                              >
                                <span className="truncate">{emp.name}</span>
                                <Check className={"h-4 w-4 " + (isSelected ? "opacity-100" : "opacity-0")} />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                onClick={() => setReassignOpen(false)}
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
                onClick={saveReassign} 
                className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Reassign
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Animated */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">
              Delete Task
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <motion.div 
              className="rounded-lg bg-gradient-to-r from-destructive/10 to-destructive/5 p-3 sm:p-4 text-xs sm:text-sm mt-2 space-y-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="font-medium break-words">{selectedTask.title}</p>
              <p className="text-muted-foreground break-words">{selectedTask.id}</p>
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
                onClick={() => setDeleteConfirmOpen(false)}
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
                onClick={confirmDelete} 
                variant="destructive"
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Delete Task
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
    </AdminLayout>
  );
};

export default Tasks;