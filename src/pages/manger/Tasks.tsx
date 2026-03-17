import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/manger/ui/button";
import { Input } from "@/components/manger/ui/input";
import { Badge } from "@/components/manger/ui/badge";
import { Avatar, AvatarFallback } from "@/components/manger/ui/avatar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/manger/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/manger/ui/command";
import { Textarea } from "@/components/manger/ui/textarea";
import { toast } from "@/components/manger/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  MapPin,
  FileText,
  Printer,
  Check,
  ChevronsUpDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Eye,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/manger/utils";
import { apiFetch } from "@/lib/manger/api";
import { getAuthState } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";

interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  assignee?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "overdue";
  dueDate: string;
  dueTime?: string;
  location?: string;
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

type TaskComment = {
  id: string;
  taskId: string;
  message: string;
  authorUsername: string;
  authorRole?: string;
  createdAt: string;
};

type TaskApi = Omit<Task, "id"> & {
  _id: string;
};

type TaskApiAttachmentFields = {
  attachmentFileName?: string;
  attachmentNote?: string;
  attachment?: Task["attachment"];
};

function normalizeTask(t: TaskApi): Task {
  const legacyAssignee = typeof t.assignee === "string" ? t.assignee.trim() : "";
  const assignees = Array.isArray(t.assignees)
    ? t.assignees.filter(Boolean)
    : legacyAssignee
      ? [legacyAssignee]
      : [];
  const extra = t as TaskApi & TaskApiAttachmentFields;
  return {
    id: t._id,
    title: t.title,
    description: t.description,
    assignees,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    location: t.location,
    createdAt: t.createdAt,
    attachmentFileName: extra.attachmentFileName,
    attachmentNote: extra.attachmentNote,
    attachment: extra.attachment,
  };
}

const priorityClasses = {
  high: "bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border-destructive/20",
  medium: "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-gradient-to-r from-green-500/20 to-emerald-500/10 text-green-600 border-green-500/20",
};

const statusClasses = {
  pending: "bg-gradient-to-r from-blue-500/20 to-blue-400/10 text-blue-600 border-blue-500/20",
  "in-progress": "bg-gradient-to-r from-amber-500/20 to-yellow-400/10 text-amber-600 border-amber-500/20",
  completed: "bg-gradient-to-r from-green-500/20 to-emerald-400/10 text-green-600 border-green-500/20",
  overdue: "bg-gradient-to-r from-red-500/20 to-rose-400/10 text-red-600 border-red-500/20",
};

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "in-progress", "completed", "overdue"]),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  location: z.string().optional(),
  assignees: z.array(z.string()).optional().default([]),
});

type CreateTaskValues = z.infer<typeof createTaskSchema>;

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNoteDraft, setAttachmentNoteDraft] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{title?: string; description?: string}>({});
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [editAssigneesOpen, setEditAssigneesOpen] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [editSelectedAssignees, setEditSelectedAssignees] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const queryClient = useQueryClient();

  const currentUsername = getAuthState().username || "";

  // Fetch tasks
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await apiFetch<{ items: TaskApi[] }>("/api/tasks");
      return res.items.map(normalizeTask);
    },
  });

  useEffect(() => {
    if (tasksQuery.data) {
      setTasks(tasksQuery.data);
    }
  }, [tasksQuery.data]);

  // Fetch employees
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await apiFetch<{ items: Employee[] }>("/api/employees");
        setEmployees(res.items.filter((e) => e.status === "active"));
      } catch {
        setEmployees([]);
      }
    };
    void loadEmployees();
  }, []);

  const activeEmployees = useMemo(() => {
    return employees.filter((e) => e.status === "active");
  }, [employees]);

  useEffect(() => {
    if (isCreateOpen) {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, dueDate: today }));
    }
  }, [isCreateOpen]);

  // Admin-style form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    status: "pending" as Task["status"],
    dueDate: "",
    dueTime: "",
    location: "",
    attachmentFileName: "",
    attachmentNote: "",
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateTaskValues }) => {
      const res = await apiFetch<{ item: TaskApi }>(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return normalizeTask(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ ok: true }>(`/api/tasks/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      dueDate: "",
      dueTime: "",
      location: "",
    },
  });

  const editForm = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      dueDate: "",
      dueTime: "",
      location: "",
    },
  });

  const validateForm = () => {
    const errors: {title?: string; description?: string} = {};
    if (!formData.title.trim()) {
      errors.title = "Task title is required";
    }
    if (!formData.description.trim()) {
      errors.description = "Task description is required";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTask = async () => {
    if (!validateForm()) return;
    
    try {
      setIsCreating(true);
      setApiError(null);
      const newTask = {
        id: `TSK-${Date.now().toString().slice(-6)}`,
        title: formData.title,
        description: formData.description,
        assignees: selectedAssignees,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        location: formData.location,
        createdAt: new Date().toISOString().split("T")[0],
        attachmentFileName: formData.attachmentFileName || "",
        attachmentNote: formData.attachmentNote || "",
      };
      if (attachmentFile) {
        console.log("Uploading file:", attachmentFile.name, "Size:", attachmentFile.size);
        const fd = new FormData();
        fd.append("title", formData.title);
        fd.append("description", formData.description);
        fd.append("assignees", JSON.stringify(selectedAssignees));
        fd.append("priority", formData.priority);
        fd.append("status", formData.status);
        fd.append("dueDate", formData.dueDate);
        fd.append("dueTime", formData.dueTime);
        fd.append("location", formData.location || "");
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
        await apiFetch("/api/tasks", {
          method: "POST",
          body: JSON.stringify(newTask),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsCreateOpen(false);
      setIsCreating(false);
      setValidationErrors({});
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        dueDate: "",
        dueTime: "",
        location: "",
        attachmentFileName: "",
        attachmentNote: "",
      });
      setSelectedAssignees([]);
      setAttachmentFile(null);
      toast({
        title: "Task created",
        description: "Your task has been added to the list.",
      });
    } catch (e) {
      setIsCreating(false);
      setApiError(e instanceof Error ? e.message : "Failed to create task");
      toast({
        title: "Failed to create task",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const openView = (task: Task) => {
    setSelectedTask(task);
    setIsViewOpen(true);
    void loadComments(task.id);
  };

  const loadComments = async (taskId: string) => {
    try {
      setCommentsLoading(true);
      setCommentError(null);
      const res = await apiFetch<{ items: TaskComment[] }>(`/api/tasks/${encodeURIComponent(taskId)}/comments`);
      setComments(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Failed to load messages");
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const sendComment = async () => {
    if (!selectedTask) return;
    const msg = commentDraft.trim();
    if (!msg) return;

    try {
      setCommentError(null);
      const res = await apiFetch<{ item: TaskComment }>(`/api/tasks/${encodeURIComponent(selectedTask.id)}/comments`, {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      });
      setComments((prev) => [...prev, res.item]);
      setCommentDraft("");
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Failed to send message");
    }
  };

  const updateStatus = async (next: Task["status"]) => {
    if (!selectedTask) return;
    try {
      setStatusSaving(true);
      setCommentError(null);
      const res = await apiFetch<{ item: TaskApi }>(`/api/tasks/${encodeURIComponent(selectedTask.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      const normalized = normalizeTask(res.item);
      setSelectedTask(normalized);
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const openEdit = (task: Task) => {
    setSelectedTask(task);
    setEditSelectedAssignees(task.assignees || []);
    editForm.reset({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      dueTime: task.dueTime || "",
      location: task.location || "",
    });
    setIsEditOpen(true);
  };

  const openDelete = (task: Task) => {
    setSelectedTask(task);
    setIsDeleteOpen(true);
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
      addLabelValue("Due Date", task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—");
      addLabelValue("Location", task.location || "—");
      addLabelValue("Created", task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "—");

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
        const type: "PNG" | "JPEG" = attMime.includes("png") || attUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(attUrl, type, margin, y, renderW, renderH);
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
        .replace(/[\\/:*?"<>|]+/g, "-")
        .slice(0, 80);
      doc.save(`${safeName || "task"}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
      toast({
        title: "Failed to generate PDF",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const onEditTask = (values: CreateTaskValues) => {
    if (!selectedTask) return;

    updateTaskMutation.mutate(
      { id: selectedTask.id, payload: { ...values, assignees: editSelectedAssignees } },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setEditSelectedAssignees([]);
          toast({
            title: "Task updated",
            description: "Task has been updated.",
          });
        },
        onError: (err) => {
          toast({
            title: "Failed to update task",
            description: err instanceof Error ? err.message : "Something went wrong",
          });
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!selectedTask) return;
    const toDelete = selectedTask;

    deleteTaskMutation.mutate(toDelete.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedTask(null);
        toast({
          title: "Task deleted",
          description: "Task has been removed.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to delete task",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const assigneesText = Array.isArray(task.assignees) ? task.assignees.join(" ") : "";
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assigneesText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Task Management</h1>
          <p className="page-subtitle">Create, assign, and track all tasks</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Task
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a task and assign it.</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); void handleCreateTask(); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="Task title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (validationErrors.title) setValidationErrors({...validationErrors, title: undefined});
                  }}
                  className={validationErrors.title ? 'border-destructive ring-1 ring-destructive' : ''}
                />
                {validationErrors.title && (
                  <p className="text-xs text-destructive">{validationErrors.title}</p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  placeholder="Short description"
                  className={`min-h-[90px] ${validationErrors.description ? 'border-destructive ring-1 ring-destructive' : ''}`}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (validationErrors.description) setValidationErrors({...validationErrors, description: undefined});
                  }}
                />
                {validationErrors.description && (
                  <p className="text-xs text-destructive">{validationErrors.description}</p>
                )}
              </div>

              {/* Multi-Assignees */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Assignees</label>
                  <Popover open={assigneesOpen} onOpenChange={setAssigneesOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-10"
                      >
                        <span className="truncate">
                          {selectedAssignees.length > 0
                            ? selectedAssignees.join(", ")
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
                            {activeEmployees.map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={employee.name}
                                onSelect={() => {
                                  setSelectedAssignees((prev) =>
                                    prev.includes(employee.name)
                                      ? prev.filter((name) => name !== employee.name)
                                      : [...prev, employee.name]
                                  );
                                  setAssigneesOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedAssignees.includes(employee.name)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {employee.initials}
                                  </AvatarFallback>
                                </Avatar>
                                {employee.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="e.g. Main Office"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as Task["priority"] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as Task["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Created */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Created</label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                </div>

                {/* Due Time */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Due Time</label>
                  <Input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                  />
                </div>

                {/* Attachment */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Attachment</label>
                  <div
                    className="w-full rounded-lg border px-3 py-3 text-sm bg-gradient-to-br from-muted/20 to-muted/5 hover:from-muted/30 hover:to-muted/10 transition-all cursor-pointer"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-primary", "bg-primary/5");
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                      const f = e.dataTransfer.files?.[0];
                      if (f) {
                        setAttachmentFile(f);
                      }
                    }}
                    onClick={() => {
                      const el = document.getElementById("manager-task-attachment-input") as HTMLInputElement | null;
                      el?.click();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const el = document.getElementById("manager-task-attachment-input") as HTMLInputElement | null;
                        el?.click();
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachmentFile ? attachmentFile.name : "Click to choose or drag & drop a file"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Max 10MB
                        </p>
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <input
                      id="manager-task-attachment-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setAttachmentFile(f);
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Attachment Note</label>
                    <Input
                      value={attachmentNoteDraft}
                      onChange={(e) => setAttachmentNoteDraft(e.target.value)}
                      placeholder="e.g., before/after photo"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setSelectedAssignees([]);
                    setAttachmentFile(null);
                    setAttachmentNoteDraft("");
                    setValidationErrors({});
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" className="gap-2 w-full sm:w-auto" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) {
            setSelectedTask(null);
            setComments([]);
            setCommentDraft("");
            setCommentError(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>View task information.</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{selectedTask.title}</p>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-muted-foreground">Assignees</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                      selectedTask.assignees.map((assignee, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {assignee.split(" ").map((n) => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-foreground text-sm">{assignee}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-foreground">Unassigned</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Location</p>
                  <p className="text-foreground">{selectedTask.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Priority</p>
                  <p className="text-foreground capitalize">{selectedTask.priority}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(v) => {
                      void updateStatus(v as Task["status"]);
                    }}
                    disabled={statusSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="text-foreground">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Created</p>
                  <p className="text-foreground">{new Date(selectedTask.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Attachment</p>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  {selectedTask.attachment?.url ? (
                    <>
                      {selectedTask.attachment.mimeType?.startsWith("image/") ? (
                        <div className="w-full overflow-hidden rounded-lg border bg-background">
                          <img
                            src={selectedTask.attachment.url}
                            alt={selectedTask.attachment.fileName || "Attachment"}
                            className="w-full h-auto max-h-64 object-contain"
                          />
                        </div>
                      ) : null}

                      <div className="flex items-center gap-3 rounded-lg bg-background/60 p-2">
                        <FileText className="h-8 w-8 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
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
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md"
                        >
                          Download
                        </a>
                      </div>
                    </>
                  ) : selectedTask.attachmentFileName ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="break-words">{selectedTask.attachmentFileName}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}

                  {selectedTask.attachmentNote ? (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      <span className="font-medium">Note:</span> {selectedTask.attachmentNote}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"></span>
                    Messages
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!selectedTask) return;
                      void loadComments(selectedTask.id);
                    }}
                    disabled={commentsLoading}
                    className="h-8 px-3 text-xs gap-1"
                  >
                    <span className={`${commentsLoading ? 'animate-spin' : ''}`}>⟳</span>
                    Refresh
                  </Button>
                </div>

                {commentError ? (
                  <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {commentError}
                  </div>
                ) : null}

                {/* Messages Container - WhatsApp Style */}
                <div className="rounded-xl bg-[#e5ded7] dark:bg-[#0b141a] p-4 space-y-3 min-h-[300px]">
                  {commentsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                        <span className="text-lg">💬</span>
                      </div>
                      <p className="text-xs text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Start the conversation</p>
                    </div>
                  ) : (
                    comments.map((c, index) => {
                      const isMine = !!currentUsername && c.authorUsername === currentUsername;
                      return (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`
                              max-w-[85%] relative group
                              ${isMine 
                                ? 'bg-[#bfdbfe] dark:bg-[#2563eb] text-foreground dark:text-white' 
                                : 'bg-white dark:bg-[#202c33] text-foreground dark:text-white'
                              }
                              rounded-lg px-3 py-2 shadow-sm
                            `}
                            style={{
                              borderRadius: isMine 
                                ? '18px 18px 4px 18px' 
                                : '18px 18px 18px 4px'
                            }}
                          >
                            {/* Author Name - Only show for others */}
                            {!isMine && (
                              <p className="text-xs font-semibold text-primary dark:text-primary/90 mb-1">
                                {c.authorUsername}
                                {c.authorRole && (
                                  <span className="text-[10px] text-muted-foreground ml-1">
                                    • {c.authorRole}
                                  </span>
                                )}
                              </p>
                            )}
                            
                            {/* Message Content */}
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {c.message}
                            </p>
                            
                            {/* Message Footer with Time */}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] opacity-70">
                                {new Date(c.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              {isMine && (
                                <span className="text-[10px] opacity-70">✓✓</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Message Input - WhatsApp Style */}
                <div className="flex items-center gap-2 bg-background rounded-lg p-1 border">
                  <Input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendComment();
                      }
                    }}
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                  />
                  <Button 
                    type="button" 
                    onClick={() => void sendComment()} 
                    disabled={!commentDraft.trim()}
                    size="sm"
                    className="rounded-full w-9 h-9 p-0 bg-primary hover:bg-primary/90"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                    </svg>
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!selectedTask) return;
                    void handlePrintTask(selectedTask);
                  }}
                >
                  Print
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!selectedTask) return;
                    setIsViewOpen(false);
                    openEdit(selectedTask);
                  }}
                >
                  Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedTask(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details.</DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditTask)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Short description" className="min-h-[90px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Multi-Assignees Edit */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Assignees *</label>
                  <Popover open={editAssigneesOpen} onOpenChange={setEditAssigneesOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-10"
                      >
                        <span className="truncate">
                          {editSelectedAssignees.length > 0
                            ? editSelectedAssignees.join(", ")
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
                            {activeEmployees.map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={employee.name}
                                onSelect={() => {
                                  setEditSelectedAssignees((prev) =>
                                    prev.includes(employee.name)
                                      ? prev.filter((name) => name !== employee.name)
                                      : [...prev, employee.name]
                                  );
                                  setEditAssigneesOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    editSelectedAssignees.includes(employee.name)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {employee.initials}
                                  </AvatarFallback>
                                </Avatar>
                                {employee.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {editSelectedAssignees.length === 0 && (
                    <p className="text-xs text-destructive">At least one assignee is required</p>
                  )}
                </div>

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
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
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
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="dueTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setEditSelectedAssignees([]); }} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks or assignee..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] sm:w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {tasksQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading tasks...</div>
        ) : tasksQuery.isError ? (
          <div className="p-6 text-sm text-destructive">
            {tasksQuery.error instanceof Error
              ? tasksQuery.error.message
              : "Failed to load tasks"}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[980px]">
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignees</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Location</th>
                <th>Print</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, index) => (
                <tr
                  key={task.id}
                  className="animate-fade-in cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => openView(task)}
                >
                  <td>
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex -space-x-2">
                          {task.assignees.slice(0, 3).map((assignee, idx) => (
                            <Avatar key={idx} className="w-7 h-7 border-2 border-background">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {assignee
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignees.length > 3 && (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          ?
                        </div>
                      )}
                      <span className="text-foreground text-sm">
                        {task.assignees && task.assignees.length > 0
                          ? task.assignees.slice(0, 2).join(", ") + (task.assignees.length > 2 ? ` +${task.assignees.length - 2} more` : "")
                          : "Unassigned"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge
                      variant="outline"
                      className={cn("text-xs border whitespace-nowrap", priorityClasses[task.priority])}
                    >
                      {task.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs whitespace-nowrap", statusClasses[task.status])}
                    >
                      {task.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{task.location}</span>
                    </div>
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handlePrintTask(task);
                      }}
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          aria-label="Task actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(task)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handlePrintTask(task)}>
                          Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(task)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDelete(task)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="text-center sm:text-left">Showing {filteredTasks.length} of {tasks.length} tasks</span>
        <div className="flex items-center justify-center sm:justify-end gap-4 overflow-x-auto pb-1 sm:pb-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            {tasks.filter((t) => t.status === "completed").length} completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {tasks.filter((t) => t.status === "in-progress").length} in progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            {tasks.filter((t) => t.status === "pending").length} pending
          </span>
        </div>
      </div>
    </div>
  );
}
