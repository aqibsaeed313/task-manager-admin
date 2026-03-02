import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/manger/utils";
import { Clock, User, MoreHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/manger/api";

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: "active" | "pending" | "completed";
  dueDate: string;
  location?: string;
}

type TaskApi = {
  _id?: string;
  id?: string;
  title?: string;
  assignee?: string;
  priority?: string;
  status?: string;
  dueDate?: string | Date;
  dueTime?: string;
  location?: string;
};

function formatDueLabel(dueDate?: string | Date, dueTime?: string) {
  if (!dueDate) return "";
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";

  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  let dayLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (d >= start && d <= end) dayLabel = "Today";
  else {
    const yStart = new Date(start);
    yStart.setDate(yStart.getDate() - 1);
    const yEnd = new Date(end);
    yEnd.setDate(yEnd.getDate() - 1);
    if (d >= yStart && d <= yEnd) dayLabel = "Yesterday";
  }

  const t = String(dueTime || "").trim();
  return t ? `${dayLabel}, ${t}` : dayLabel;
}

function normalizeTask(t: TaskApi): Task {
  const rawStatus = String(t.status || "").toLowerCase();
  const status: Task["status"] = rawStatus === "completed" ? "completed" : rawStatus === "pending" ? "pending" : "active";

  const rawPriority = String(t.priority || "").toLowerCase();
  const priority: Task["priority"] = rawPriority === "high" ? "high" : rawPriority === "low" ? "low" : "medium";

  return {
    id: String(t.id || t._id || ""),
    title: String(t.title || ""),
    assignee: String(t.assignee || ""),
    priority,
    status,
    dueDate: formatDueLabel(t.dueDate, t.dueTime),
    location: typeof t.location === "string" ? t.location : "",
  };
}

const priorityStyles = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

const statusStyles = {
  active: "status-active",
  pending: "status-pending",
  completed: "status-completed",
};

export function TaskList() {
  const tasksQuery = useQuery({
    queryKey: ["dashboard", "recent-tasks"],
    queryFn: async () => {
      const res = await apiFetch<{ items: TaskApi[] }>("/api/tasks");
      const items = Array.isArray(res?.items) ? res.items : [];
      return items.map(normalizeTask);
    },
  });

  const tasks = (tasksQuery.data || []).slice(0, 5);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 bg-slate-50">
        <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
          Priority Tasks
        </h3>
      </div>
      <div className="divide-y divide-border">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className="px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-foreground truncate">
                    {task.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn("text-xs border", priorityStyles[task.priority])}
                  >
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate">{task.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{task.dueDate || "—"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <Badge variant="secondary" className={cn("text-xs", statusStyles[task.status])}>
                  {task.status}
                </Badge>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Task actions">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
