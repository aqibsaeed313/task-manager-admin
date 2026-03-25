import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/admin/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/admin/ui/command";
import { Textarea } from "@/components/admin/ui/textarea";
import { toast } from "@/components/admin/ui/use-toast";
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
  X,
} from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { apiFetch } from "@/lib/admin/apiClient";
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
  projectId?: string;
  attachmentFileName?: string;
  attachmentNote?: string;
  attachment?: {
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
  };
}

type CreateProjectTaskDraft = {
  title: string;
  description: string;
  assignees: string[];
  priority: Task["priority"];
  status: Task["status"];
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
};

type CreateProjectPayload = {
  name: string;
  description: string;
  assignees?: string[];
  logo?: ProjectLogo;
  tasks: Array<Omit<CreateProjectTaskDraft, "location">>;
};

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

interface ProjectLogo {
  fileName?: string;
  url?: string;
  mimeType?: string;
  size?: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdByUsername?: string;
  createdAt?: string;
  assignees?: string[];
  logo?: ProjectLogo;
  taskCount?: number;
  status?: string;
}

interface ProjectWithTasks extends Project {
  tasks: Task[];
  taskCount?: number;
  status?: string;
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectLogoFile, setProjectLogoFile] = useState<File | null>(null);
  const [projectLogoPreview, setProjectLogoPreview] = useState<string>("");
  const [projectTasks, setProjectTasks] = useState<CreateProjectTaskDraft[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNoteDraft, setAttachmentNoteDraft] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ projectName?: string; title?: string; description?: string }>({});
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [editAssigneesOpen, setEditAssigneesOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithTasks | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isDirectTask, setIsDirectTask] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
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

  // Fetch projects
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await apiFetch<{ items: Project[] }>("/api/projects");
      return res.items;
    },
  });

  useEffect(() => {
    if (tasksQuery.data) {
      setTasks(tasksQuery.data);
    }
  }, [tasksQuery.data]);

  useEffect(() => {
    if (!selectedProject && tasksQuery.data) {
      setTasks(tasksQuery.data);
    }
  }, [selectedProject, tasksQuery.data]);

  useEffect(() => {
    if (projectsQuery.data) {
      setProjects(projectsQuery.data);
    }
  }, [projectsQuery.data]);

  const loadProject = async (projectId: string) => {
    setIsLoadingProject(true);
    setSelectedProject(null);

    try {
      const res = await apiFetch<{ item: ProjectWithTasks }>(`/api/projects/${encodeURIComponent(projectId)}`);
      if (!res.item) {
        throw new Error("Project not found");
      }

      const project = res.item;
      const projectTasks: Task[] = Array.isArray(project.tasks) ? project.tasks : [];

      setSelectedProject({ ...project, tasks: projectTasks });
      setTasks(projectTasks);
    } catch (err) {
      toast({ title: "Failed to load project", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
      setSelectedProject(null);
      setTasks([]);
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    const viewId = String(searchParams.get("view") || "").trim();
    if (!viewId) return;
    if (isViewOpen || isEditOpen || isDeleteOpen || isCreateOpen) return;

    const match = tasks.find((t) => String(t.id) === viewId);
    if (!match) return;

    openView(match);

    const next = new URLSearchParams(searchParams);
    next.delete("view");
    setSearchParams(next, { replace: true });
  }, [tasks, searchParams, setSearchParams, isViewOpen, isEditOpen, isDeleteOpen, isCreateOpen]);

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

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      const res = await apiFetch<any>(`/api/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedProject) {
        setSelectedProject({ ...selectedProject, status: selectedProject.status });
      }
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
    const errors: { projectName?: string; title?: string; description?: string } = {};
    if (!projectName.trim()) {
      errors.projectName = "Project name is required";
    }
    if (projectTasks.length === 0) {
      errors.title = "At least one task is required";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetProjectFlow = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectTasks([]);
    setProjectLogoFile(null);
    setProjectLogoPreview("");
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
  };

  const draftFromForm = (attachmentOverride?: CreateProjectTaskDraft["attachment"]) => {
    const createdAt = new Date().toISOString().split("T")[0];
    const att = attachmentOverride
      ? attachmentOverride
      : attachmentFile
        ? {
            fileName: attachmentFile.name,
            url: "",
            mimeType: attachmentFile.type,
            size: attachmentFile.size,
          }
        : undefined;

    return {
      title: formData.title,
      description: formData.description,
      assignees: selectedAssignees,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
      location: formData.location,
      createdAt,
      attachmentFileName: formData.attachmentFileName || attachmentFile?.name || "",
      attachmentNote: formData.attachmentNote || "",
      attachment: att,
    } satisfies CreateProjectTaskDraft;
  };

  const addTaskToProject = async () => {
    const errors: { title?: string; description?: string } = {};
    if (!formData.title.trim()) errors.title = "Task title is required";
    if (!formData.description.trim()) errors.description = "Task description is required";

    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...errors }));
      return;
    }

    if (attachmentFile) {
      const file = attachmentFile;
      const attachment = await new Promise<CreateProjectTaskDraft["attachment"]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.onload = () => {
          const url = typeof reader.result === "string" ? reader.result : "";
          resolve({
            fileName: file.name,
            url,
            mimeType: file.type,
            size: file.size,
          });
        };
        reader.readAsDataURL(file);
      });

      setProjectTasks((prev) => [...prev, draftFromForm(attachment)]);
    } else {
      setProjectTasks((prev) => [...prev, draftFromForm(undefined)]);
    }

    setValidationErrors((prev) => ({ ...prev, title: undefined, description: undefined }));
    setFormData((prev) => ({
      ...prev,
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      dueDate: "",
      dueTime: "",
      location: "",
      attachmentFileName: "",
      attachmentNote: "",
    }));
    setSelectedAssignees([]);
    setAttachmentFile(null);
    setIsCreateTaskOpen(false);
  };

  const handleCreateProject = async () => {
    if (!validateForm()) return;

    try {
      setIsCreating(true);
      setApiError(null);

      const description = projectDescription?.trim() || "—";

      const projectLogo = projectLogoFile
        ? await new Promise<ProjectLogo>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Failed to read project logo"));
            reader.onload = () => {
              const url = typeof reader.result === "string" ? reader.result : "";
              resolve({
                fileName: projectLogoFile.name,
                url,
                mimeType: projectLogoFile.type,
                size: projectLogoFile.size,
              });
            };
            reader.readAsDataURL(projectLogoFile);
          })
        : undefined;

      const tasksToCreate: CreateProjectTaskDraft[] =
        projectTasks.length > 0 ? projectTasks : [draftFromForm(undefined)];

      const payload: CreateProjectPayload & { assignees?: string[]; logo?: ProjectLogo } = {
        name: projectName.trim(),
        description,
        assignees: selectedAssignees,
        logo: projectLogo,
        tasks: tasksToCreate,
      };

      await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsCreateOpen(false);
      setIsCreating(false);
      resetProjectFlow();
      toast({
        title: "Project created",
        description: "Your project has been created with tasks.",
      });
    } catch (e) {
      setIsCreating(false);
      setApiError(e instanceof Error ? e.message : "Failed to create project");
      toast({
        title: "Failed to create project",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleCreateTask = async () => {
    if (!isDirectTask && !selectedProject) {
      toast({ title: "Select a project first", description: "Please choose a project before creating a task.", variant: "destructive" });
      return;
    }

    const errors: { title?: string; description?: string } = {};
    if (!formData.title.trim()) errors.title = "Task title is required";
    if (!formData.description.trim()) errors.description = "Task description is required";

    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...errors }));
      return;
    }

    try {
      setIsCreating(true);
      const nowDate = new Date().toISOString().split("T")[0];

      const attachment = attachmentFile
        ? await new Promise<CreateProjectTaskDraft["attachment"]>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.onload = () => {
              const url = typeof reader.result === "string" ? reader.result : "";
              resolve({
                fileName: attachmentFile.name,
                url,
                mimeType: attachmentFile.type,
                size: attachmentFile.size,
              });
            };
            reader.readAsDataURL(attachmentFile);
          })
        : undefined;

      const taskPayload: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        assignees: selectedAssignees,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || nowDate,
        dueTime: formData.dueTime,
        location: formData.location,
        createdAt: nowDate,
        attachmentFileName: attachmentFile?.name || "",
        attachmentNote: formData.attachmentNote,
        attachment,
      };

      // Only add projectId if not a direct task
      if (!isDirectTask && selectedProject) {
        taskPayload.projectId = selectedProject.id;
      }

      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify(taskPayload),
      });

      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (!isDirectTask && selectedProject?.id) {
        void loadProject(selectedProject.id);
      }

      setIsCreating(false);
      setIsCreateTaskOpen(false);
      setIsDirectTask(false);
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
      setValidationErrors({});

      toast({
        title: "Task created",
        description: isDirectTask ? "New standalone task has been created." : "New task has been added to the project.",
      });
    } catch (e) {
      setIsCreating(false);
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

  const sourceTasks = selectedProject ? selectedProject.tasks : tasks;

  const filteredTasks = useMemo(() => {
    return sourceTasks.filter((task) => {
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
  }, [sourceTasks, searchQuery, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Task Management</h1>
          <p className="page-subtitle">Create, assign, and track all tasks</p>
        </div>
        <div className="flex gap-2">
          {selectedProject ? (
            <>
              <Button variant="outline" onClick={() => setSelectedProject(null)}>
                Back to Projects
              </Button>
              <Button className="gap-2" onClick={() => setIsCreateTaskOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </>
          ) : (
            <>
              <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
              <Button className="gap-2" onClick={() => {
                setIsDirectTask(true);
                setIsCreateTaskOpen(true);
              }}>
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
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

      {selectedProject ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4">
          <div className="flex items-start gap-3">
            {selectedProject.logo?.url ? (
              <img src={selectedProject.logo.url} alt={`${selectedProject.name} logo`} className="w-12 h-12 rounded-md object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">Logo</div>
            )}
            <div>
              <h2 className="font-semibold text-lg">Project: {selectedProject.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedProject.description || "No description"}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedProject.assignees && selectedProject.assignees.length > 0 ? selectedProject.assignees.join(", ") : "No assignees"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
            <span>{selectedProject.tasks.length} tasks</span>
            <Select value={selectedProject.status || "No status"} onValueChange={(value) => {
              updateProjectStatusMutation.mutate({ projectId: selectedProject.id, status: value }, {
                onSuccess: () => {
                  setSelectedProject({...selectedProject, status: value});
                }
              });
            }}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No tasks">No tasks</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <span>{selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString() : ""}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4">
            <h2 className="font-semibold text-lg mb-3">Projects</h2>
            {projectsQuery.isLoading ? (
              <p className="text-muted-foreground">Loading projects...</p>
            ) : projectsQuery.isError ? (
              <p className="text-destructive">Failed to load projects</p>
            ) : projects.length === 0 ? (
              <p className="text-muted-foreground">No projects found. Create one to begin.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                  const assigneeList = Array.isArray(project.assignees) && project.assignees.length > 0 
                    ? project.assignees 
                    : [];
                  const taskNum = project.taskCount ?? 0;
                  
                  return (
                    <button
                      key={project.id}
                      onClick={() => void loadProject(project.id)}
                      className="text-left p-3 sm:p-4 rounded-lg border border-border hover:border-primary transition bg-card shadow-sm hover:shadow-card"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {project.logo?.url ? (
                          <img src={project.logo.url} alt={`${project.name} logo`} className="w-10 h-10 rounded-md object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">Logo</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{project.description || "No description"}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span className="truncate">{assigneeList.length > 0 ? assigneeList.join(", ") : "No assignees"}</span>
                        <span className="ml-2 flex-shrink-0">{taskNum} task{taskNum === 1 ? "" : "s"}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <Badge className="capitalize" variant="outline">
                          {project.status || "No tasks"}
                        </Badge>
                        <span className="text-muted-foreground">
                          {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4">
            <h2 className="font-semibold text-lg mb-3">Tasks</h2>
            {tasksQuery.isLoading ? (
              <p className="text-muted-foreground">Loading tasks...</p>
            ) : tasksQuery.isError ? (
              <p className="text-destructive">Failed to load tasks</p>
            ) : tasks.filter(t => !t.projectId).length === 0 ? (
              <p className="text-muted-foreground">No standalone tasks found. Create one to begin.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tasks.filter(t => !t.projectId).map((task) => {
                  const assigneeList = Array.isArray(task.assignees) && task.assignees.length > 0 
                    ? task.assignees 
                    : [];
                  
                  return (
                    <button
                      key={task.id}
                      onClick={() => {
                        openView(task);
                      }}
                      className="text-left p-3 sm:p-4 rounded-lg border border-border hover:border-primary transition bg-card shadow-sm hover:shadow-card"
                    >
                      <div className="mb-2">
                        <p className="font-medium truncate text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{task.description || "No description"}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span className="truncate">{assigneeList.length > 0 ? assigneeList.join(", ") : "Unassigned"}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                        <div className="flex gap-1">
                          <Badge className="capitalize" variant="outline" style={{
                            backgroundColor: task.priority === 'high' ? 'rgb(239, 68, 68)' : task.priority === 'medium' ? 'rgb(234, 179, 8)' : 'rgb(34, 197, 94)',
                            color: 'white'
                          }}>
                            {task.priority}
                          </Badge>
                          <Badge className="capitalize" variant="outline">
                            {task.status}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Create a project and assign it.</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); void handleCreateProject(); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Project Name *</label>
                <Input
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    if (validationErrors.projectName) {
                      setValidationErrors({ ...validationErrors, projectName: undefined });
                    }
                  }}
                  className={validationErrors.projectName ? "border-destructive ring-1 ring-destructive" : ""}
                />
                {validationErrors.projectName && (
                  <p className="text-xs text-destructive">{validationErrors.projectName}</p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Project Description</label>
                <Textarea
                  placeholder="Short project description"
                  className="min-h-[80px]"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Project Logo</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="py-2 px-3 border border-border rounded-md text-sm hover:bg-muted"
                    onClick={() => {
                      const el = document.getElementById("project-logo-input") as HTMLInputElement | null;
                      el?.click();
                    }}
                  >
                    Upload Logo
                  </button>
                  {projectLogoPreview ? (
                    <img src={projectLogoPreview} alt="Project Logo" className="w-10 h-10 rounded-md object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">No logo</div>
                  )}
                </div>
                <input
                  id="project-logo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setProjectLogoFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setProjectLogoPreview(typeof reader.result === "string" ? reader.result : "");
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setProjectLogoPreview("");
                    }
                  }}
                />
              </div>

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
            </div>

            {/* Tasks Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Project Tasks</label>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              </div>
              
              {projectTasks.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto border border-border rounded-md p-3">
                  {projectTasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-muted/50 rounded-md">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title || `Task ${idx + 1}`}</p>
                        <p className="text-xs text-muted-foreground truncate">{task.description || "No description"}</p>
                        <div className="flex gap-2 mt-1 flex-wrap text-xs">
                          <span className="px-2 py-0.5 bg-muted rounded capitalize">{task.priority}</span>
                          <span className="px-2 py-0.5 bg-muted rounded capitalize">{task.status}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProjectTasks((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-md p-4 text-center text-sm text-muted-foreground">
                  No tasks added yet. Add at least one task to create the project.
                </div>
              )}
              {validationErrors.title && (
                <p className="text-xs text-destructive">{validationErrors.title}</p>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="w-full sm:w-auto gap-2">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateTaskOpen} onOpenChange={(open) => {
        setIsCreateTaskOpen(open);
        if (!open) setIsDirectTask(false);
      }}>
        <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isDirectTask ? "Create Standalone Task" : "Create Task"}</DialogTitle>
            <DialogDescription>
              {isDirectTask 
                ? "Create a new standalone task without a project." 
                : "Create a new task under the selected project."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void (isCreateOpen ? addTaskToProject() : handleCreateTask());
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Task Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                />
                {validationErrors.title && <p className="text-xs text-destructive">{validationErrors.title}</p>}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Task Description *</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
                {validationErrors.description && <p className="text-xs text-destructive">{validationErrors.description}</p>}
              </div>
              <div className="sm:col-span-1 space-y-1.5">
                <label className="text-sm font-medium">Priority</label>
                <Select value={formData.priority} onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value as Task['priority'] }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-1 space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as Task['status'] }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setIsCreateTaskOpen(false);
                setIsDirectTask(false);
              }} disabled={isCreating} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={isCreating} className="w-full sm:w-auto gap-2">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                {isDirectTask ? "Create Task" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
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
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setEditSelectedAssignees([]); }} disabled={updateTaskMutation.isPending} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTaskMutation.isPending} className="w-full sm:w-auto gap-2">{updateTaskMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
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
            <AlertDialogCancel disabled={deleteTaskMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteTaskMutation.isPending} className="gap-2">{deleteTaskMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Cards Grid (only visible after project selected) */}
      {selectedProject && (
        <div className="space-y-6">
          {tasksQuery.isLoading ? (
            <div className="bg-card rounded-xl border border-border p-6 text-sm text-muted-foreground">
              Loading tasks...
            </div>
          ) : tasksQuery.isError ? (
            <div className="bg-card rounded-xl border border-border p-6 text-sm text-destructive">
              {tasksQuery.error instanceof Error
                ? tasksQuery.error.message
                : "Failed to load tasks"}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 text-sm text-muted-foreground text-center">
              No tasks found
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-xl border border-muted/50 hover:border-primary/50 transition-all hover:shadow-md overflow-hidden flex flex-col group cursor-pointer"
                    onClick={() => openView(task)}
                  >
                    {/* Card Header with Title and Menu */}
                    <div className="p-4 border-b border-muted/30 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground line-clamp-1">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{task.priority} priority</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Task actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openView(task); }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void handlePrintTask(task); }}>
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(task); }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDelete(task); }}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 space-y-3">
                      {/* Description */}
                      <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>

                      {/* Assignees */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Assigned to</p>
                        <div className="flex items-center gap-2">
                          {task.assignees && task.assignees.length > 0 ? (
                            <>
                              <div className="flex -space-x-2">
                                {task.assignees.slice(0, 3).map((assignee, idx) => (
                                  <Avatar key={idx} className="w-7 h-7 border-2 border-background">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
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
                              <span className="text-sm text-foreground">
                                {task.assignees.slice(0, 2).join(", ")} {task.assignees.length > 2 ? `+${task.assignees.length - 2}` : ""}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </div>
                      </div>

                      {/* Status & Priority Badges */}
                      <div className="flex gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", statusClasses[task.status])}
                        >
                          {task.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-xs border", priorityClasses[task.priority])}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* Card Footer with Dates and Location */}
                    <div className="p-4 border-t border-muted/30 bg-muted/10 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs">Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                      {task.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-xs">{task.location}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Stats Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-muted-foreground mt-6 pt-4 border-t border-muted/20">
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
            </>
          )}
        </div>
      )}
    </div>
  );
}