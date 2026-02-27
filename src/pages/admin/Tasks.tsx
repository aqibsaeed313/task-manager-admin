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
} from "lucide-react";
import { apiFetch, createResource, deleteResource, listResource, updateResource } from "@/lib/admin/apiClient";

interface Task {
  id: string;
  title: string;
  description: string;
  location: string;
  assignee: string;
  assigneeInitials: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "overdue";
  dueDate: string;
  dueTime: string;
  createdAt: string;
  attachmentFileName?: string;
  attachmentNote?: string;
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

const tasks: Task[] = [
  {
    id: "TSK-001",
    title: "HVAC Filter Replacement",
    description: "Replace all HVAC filters on floor 3",
    location: "Building A - Floor 3",
    assignee: "John Doe",
    assigneeInitials: "JD",
    priority: "high",
    status: "in-progress",
    dueDate: "2024-01-15",
    dueTime: "2:00 PM",
    createdAt: "2024-01-10",
  },
  {
    id: "TSK-002",
    title: "Office Deep Cleaning",
    description: "Complete deep cleaning of main hall and offices",
    location: "Building B - Main Hall",
    assignee: "Sarah Miller",
    assigneeInitials: "SM",
    priority: "medium",
    status: "pending",
    dueDate: "2024-01-15",
    dueTime: "4:00 PM",
    createdAt: "2024-01-12",
  },
  {
    id: "TSK-003",
    title: "Equipment Inspection",
    description: "Quarterly inspection of all warehouse equipment",
    location: "Warehouse C",
    assignee: "Mike Johnson",
    assigneeInitials: "MJ",
    priority: "low",
    status: "pending",
    dueDate: "2024-01-16",
    dueTime: "5:30 PM",
    createdAt: "2024-01-11",
  },
  {
    id: "TSK-004",
    title: "Parking Lot Maintenance",
    description: "Repair potholes and repaint parking lines",
    location: "Main Parking Area",
    assignee: "Emily Brown",
    assigneeInitials: "EB",
    priority: "high",
    status: "completed",
    dueDate: "2024-01-14",
    dueTime: "11:00 AM",
    createdAt: "2024-01-08",
  },
  {
    id: "TSK-005",
    title: "Fire Extinguisher Check",
    description: "Monthly fire safety equipment inspection",
    location: "All Buildings",
    assignee: "Alex Wilson",
    assigneeInitials: "AW",
    priority: "high",
    status: "overdue",
    dueDate: "2024-01-10",
    dueTime: "3:00 PM",
    createdAt: "2024-01-05",
  },
  {
    id: "TSK-006",
    title: "Landscape Maintenance",
    description: "Trim bushes and mow lawns in front area",
    location: "Front Entrance",
    assignee: "Tom Garcia",
    assigneeInitials: "TG",
    priority: "medium",
    status: "in-progress",
    dueDate: "2024-01-15",
    dueTime: "1:00 PM",
    createdAt: "2024-01-13",
  },
];

const priorityClasses = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

const statusClasses = {
  pending: "bg-muted text-muted-foreground",
  "in-progress": "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    location: "",
    assignee: "",
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
    location: "",
    assignee: "",
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
        setTasksList(taskList);
        
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
    setTasksList(list);
  };

  const handleCreateTask = async () => {
    if (!formData.title || !formData.assignee || !formData.dueDate) return;
    try {
      setApiError(null);
      const newTask: Task = {
        id: `TSK-${Date.now().toString().slice(-6)}`,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        assignee: formData.assignee,
        assigneeInitials: formData.assignee
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        createdAt: new Date().toISOString().split("T")[0],
        attachmentFileName: formData.attachmentFileName || "",
        attachmentNote: formData.attachmentNote || "",
      };
      if (attachmentFile) {
        const fd = new FormData();
        fd.append("title", formData.title);
        fd.append("description", formData.description);
        fd.append("location", formData.location);
        fd.append("assignee", formData.assignee);
        fd.append("priority", formData.priority);
        fd.append("status", formData.status);
        fd.append("dueDate", formData.dueDate);
        fd.append("dueTime", formData.dueTime);
        fd.append("createdAt", newTask.createdAt);
        fd.append("attachmentFileName", attachmentFile.name);
        fd.append("attachmentNote", formData.attachmentNote);
        fd.append("file", attachmentFile);

        await apiFetch<{ item: Task }>("/api/tasks/upload", {
          method: "POST",
          body: fd,
        });
      } else {
        await createResource<Task>("tasks", newTask);
      }
      await refreshTasks();
      setCreateTaskOpen(false);
      setFormData({
        title: "",
        description: "",
        location: "",
        assignee: "",
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
    setSelectedTask(task);
    setViewDetailsOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditFormData({
      title: task.title,
      description: task.description,
      location: task.location,
      assignee: task.assignee,
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
    setSelectedTask(task);
    setEditFormData({ ...editFormData, assignee: task.assignee });
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
        location: editFormData.location,
        assignee: editFormData.assignee,
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
        assignee: editFormData.assignee,
        assigneeInitials: editFormData.assignee
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
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
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <AdminLayout>
      {/* Mobile-first container */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        
        {/* Page Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Task Management
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Create, assign, and track all tasks across locations.
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

          {/* Create Task Dialog */}
          <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="sm:hidden">Create</span>
                <span className="hidden sm:inline">Create Task</span>
              </Button>
            </DialogTrigger>
            
            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Create New Task</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create and assign a new task to team members
                </DialogDescription>
              </DialogHeader>
              
              <form className="space-y-4 sm:space-y-5">
                {/* Task Title */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Task Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., HVAC Filter Replacement"
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide task details..."
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base min-h-[80px] sm:min-h-24 resize-none"
                  />
                </div>

                {/* Location & Assignee */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Location *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Building A - Floor 3"
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Assignee *</label>
                    <select
                      value={formData.assignee}
                      onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                      required
                    >
                      <option value="">Select assignee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    {employees.length === 0 && (
                      <p className="text-xs text-warning mt-1">No employees found. Check console for errors.</p>
                    )}
                    {employees.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{employees.length} employee(s) available</p>
                    )}
                  </div>
                </div>

                {/* Priority, Status, Due Date */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task["priority"] })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
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
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>

                {/* Attachment File Name & Note */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Attachment</label>
                    <div
                      className="w-full rounded-md border px-3 py-3 text-sm sm:text-base bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
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
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Attachment Note</label>
                    <input
                      type="text"
                      value={formData.attachmentNote}
                      onChange={(e) => setFormData({ ...formData, attachmentNote: e.target.value })}
                      placeholder="e.g., before/after photo"
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                    />
                  </div>
                </div>
              </form>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setCreateTaskOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTask} 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters Card - Responsive */}
        <Card className="shadow-soft border-0 sm:border">
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
                    placeholder="Search by title, location, or assignee..."
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
                    <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
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

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                    More Filters
                  </label>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>More Filters</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              All Tasks ({filteredTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading tasks...
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="block sm:hidden space-y-3 p-4">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-lg border p-4 space-y-3">
                      {/* Header with ID and Actions */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground">{task.id}</p>
                          <h4 className="font-medium text-sm mt-1">{task.title}</h4>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(task)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTask(task)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReassign(task)}>
                              <User className="mr-2 h-4 w-4" />
                              Reassign
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteConfirm(task)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Priority & Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={priorityClasses[task.priority]} variant="secondary">
                          {task.priority}
                        </Badge>
                        <Badge className={statusClasses[task.status]} variant="secondary">
                          {task.status}
                        </Badge>
                      </div>

                      {/* Description (if exists) */}
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Location */}
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">Location</p>
                          <p className="text-sm">{task.location}</p>
                        </div>
                      </div>

                      {/* Assignee */}
                      <div className="flex items-start gap-2">
                        <div className="h-4 w-4 flex-shrink-0 mt-0.5">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="bg-accent/10 text-accent text-[10px]">
                              {task.assigneeInitials}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Assignee</p>
                          <p className="text-sm">{task.assignee}</p>
                        </div>
                      </div>

                      {/* Due Date & Time */}
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">Due</p>
                          <p className="text-sm">{task.dueDate} at {task.dueTime}</p>
                        </div>
                      </div>

                      {/* Attachment (if exists) */}
                      {task.attachmentFileName && (
                        <div className="pt-2 border-t">
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
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {filteredTasks.length === 0 && (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">No tasks found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your filters or create a new task
                      </p>
                    </div>
                  )}
                </div>

                {/* Tablet/Desktop View - Table */}
                <div className="hidden sm:block w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm w-[10%]">Task ID</TableHead>
                        <TableHead className="text-xs md:text-sm w-[20%]">Title</TableHead>
                        <TableHead className="text-xs md:text-sm w-[15%]">Assignee</TableHead>
                        <TableHead className="text-xs md:text-sm w-[15%]">Location</TableHead>
                        <TableHead className="text-xs md:text-sm w-[10%]">Priority</TableHead>
                        <TableHead className="text-xs md:text-sm w-[10%]">Status</TableHead>
                        <TableHead className="text-xs md:text-sm w-[10%]">Due</TableHead>
                        <TableHead className="text-right text-xs md:text-sm w-[10%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => (
                        <TableRow key={task.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs md:text-sm text-muted-foreground">
                            {task.id}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-sm md:text-base truncate max-w-[200px] lg:max-w-[250px]">
                                {task.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px] lg:max-w-[250px]">
                                {task.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0">
                                <AvatarFallback className="bg-accent/10 text-accent text-xs">
                                  {task.assigneeInitials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm md:text-base truncate max-w-[120px] lg:max-w-[150px]">
                                {task.assignee}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm md:text-base text-muted-foreground">
                              <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[120px] lg:max-w-[150px]">
                                {task.location}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${priorityClasses[task.priority]} text-xs md:text-sm`} variant="secondary">
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusClasses[task.status]} text-xs md:text-sm`} variant="secondary">
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs md:text-sm">
                              <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
                              <span>{task.dueTime}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{task.dueDate}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(task)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Task
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReassign(task)}>
                                  <User className="mr-2 h-4 w-4" />
                                  Reassign
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteConfirm(task)} className="text-destructive">
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

      {/* View Details Dialog - Responsive */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 sm:space-y-5">
              <div className="pb-4 border-b">
                <p className="text-xs sm:text-sm text-muted-foreground">{selectedTask.id}</p>
                <p className="text-base sm:text-xl font-semibold break-words mt-1">{selectedTask.title}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Description</label>
                  <p className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-2 sm:p-3 rounded-md">
                    {selectedTask.description || "—"}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Location</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="break-words">{selectedTask.location}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Assignee</label>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                      <AvatarFallback className="bg-accent/10 text-accent text-[10px] sm:text-xs">
                        {selectedTask.assigneeInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs sm:text-sm">{selectedTask.assignee}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Priority</label>
                  <div>
                    <Badge className={`${priorityClasses[selectedTask.priority]} text-xs sm:text-sm`} variant="secondary">
                      {selectedTask.priority}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Status</label>
                  <div>
                    <Badge className={`${statusClasses[selectedTask.status]} text-xs sm:text-sm`} variant="secondary">
                      {selectedTask.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Due Date & Time</label>
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedTask.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedTask.dueTime || "—"}</span>
                  </div>
                </div>
                
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Attachment</label>
                  <div className="bg-muted/30 p-2 sm:p-3 rounded-md space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">
                      {selectedTask.attachmentFileName ? selectedTask.attachmentFileName : "—"}
                    </p>
                    {selectedTask.attachmentNote && (
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {selectedTask.attachmentNote}
                      </p>
                    )}
                  </div>
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

      {/* Edit Task Dialog - Responsive */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Edit Task</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update task information and save changes
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <form className="space-y-4 sm:space-y-5">
              {/* Task Title */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5">Task Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base min-h-[80px] sm:min-h-24 resize-none"
                />
              </div>

              {/* Location & Assignee */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Location</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Assignee</label>
                  <select
                    value={editFormData.assignee}
                    onChange={(e) => setEditFormData({ ...editFormData, assignee: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                  >
                    <option value="">Select assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority, Status, Due Date */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as Task["priority"] })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
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
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
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
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
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
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
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
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Attachment Note</label>
                  <input
                    type="text"
                    value={editFormData.attachmentNote}
                    onChange={(e) => setEditFormData({ ...editFormData, attachmentNote: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
                  />
                </div>
              </div>
            </form>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setEditTaskOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveEditTask} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Task Dialog - Responsive */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Reassign Task</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Change the task assignee
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 sm:p-4 space-y-1">
                <p className="text-xs sm:text-sm font-medium">Task</p>
                <p className="text-sm sm:text-base">{selectedTask.title}</p>
              </div>
              <div className="rounded-md bg-muted p-3 sm:p-4 space-y-1">
                <p className="text-xs sm:text-sm font-medium">Current Assignee</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                    <AvatarFallback className="bg-accent/10 text-accent text-[10px] sm:text-xs">
                      {selectedTask.assigneeInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs sm:text-sm">{selectedTask.assignee}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium mb-1.5">New Assignee</label>
                <select
                  value={editFormData.assignee}
                  onChange={(e) => setEditFormData({ ...editFormData, assignee: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white"
                >
                  <option value="John Doe">John Doe</option>
                  <option value="Sarah Miller">Sarah Miller</option>
                  <option value="Mike Johnson">Mike Johnson</option>
                  <option value="Emily Brown">Emily Brown</option>
                  <option value="Alex Wilson">Alex Wilson</option>
                  <option value="Tom Garcia">Tom Garcia</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setReassignOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveReassign} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
            >
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Responsive */}
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
            <div className="rounded-md bg-destructive/10 p-3 sm:p-4 text-xs sm:text-sm mt-2 space-y-1">
              <p className="font-medium break-words">{selectedTask.title}</p>
              <p className="text-muted-foreground break-words">{selectedTask.id}</p>
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
              onClick={confirmDelete} 
              variant="destructive"
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Tasks;