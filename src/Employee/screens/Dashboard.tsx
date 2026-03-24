import { useEffect, useState } from "react";
import { EmployeeLayout } from "../components/layout/EmployeeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeeTasks } from "../lib/api";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState<Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const res = await getEmployeeTasks();
        setTasks(res.items || []);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in-progress").length,
  };

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-[#133767] to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-2">Welcome to Employee Portal</h1>
          <p className="text-blue-100">View your tasks and manage your work efficiently.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tasks assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {task.dueDate || "No due date"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : task.status === "in-progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {task.status}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
