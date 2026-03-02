import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { RecentTasksList } from "@/components/admin/dashboard/RecentTasksList";
import { ActiveEmployees } from "@/components/admin/dashboard/ActiveEmployees";
import { TaskCharts } from "@/components/admin/dashboard/TaskCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";
import { Users, CheckSquare, AlertTriangle, Clock, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { listResource } from "@/lib/admin/apiClient";

type Employee = {
  id: string;
};

type Task = {
  id: string;
  status: "pending" | "in-progress" | "completed" | "overdue";
};

type TimeEntry = {
  id: string;
  status: "clocked-in" | "clocked-out" | "on-break";
};

type ScheduleItem = {
  id: string;
  location: string;
  employee: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "canceled";
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
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [hoveredSchedule, setHoveredSchedule] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        const [emps, tks, entries, sch] = await Promise.all([
          listResource<Employee>("employees"),
          listResource<Task>("tasks"),
          listResource<TimeEntry>("time-entries"),
          listResource<ScheduleItem>("schedules"),
        ]);
        if (!mounted) return;
        setEmployees(emps);
        setTasks(tks);
        setTimeEntries(entries);
        setSchedules(sch);
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load dashboard");
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

  const metrics = useMemo(() => {
    const totalEmployees = employees.length;
    const activeTasks = tasks.filter((t) => t.status === "pending" || t.status === "in-progress").length;
    const overdueTasks = tasks.filter((t) => t.status === "overdue").length;
    const clockedInEmployees = timeEntries.filter((e) => e.status === "clocked-in" || e.status === "on-break").length;

    const upcomingSchedules = schedules
      .filter((s) => s.status === "scheduled")
      .slice()
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        const aStart = a.startTime || "00:00";
        const bStart = b.startTime || "00:00";
        if (aStart !== bStart) return aStart < bStart ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      })
      .slice(0, 5);

    return {
      totalEmployees,
      activeTasks,
      overdueTasks,
      clockedInEmployees,
      upcomingSchedules,
    };
  }, [employees.length, schedules, tasks, timeEntries]);

  // Get status color for schedule
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'scheduled':
        return 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'completed':
        return 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'canceled':
        return 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

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
          className="space-y-1.5 sm:space-y-2 relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
          <div className="relative flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </motion.div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
            Welcome back! Here's your real-time system overview with beautiful animations.
          </p>
        </motion.div>

        {/* Stats Grid with animated cards */}
        <motion.div 
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6"
          variants={containerVariants}
        >
          {[
            { title: "Total Employees", value: metrics.totalEmployees, icon: Users, variant: "primary", changeType: "positive" as const },
            { title: "Active Tasks", value: metrics.activeTasks, icon: CheckSquare, variant: "success", changeType: "neutral" as const },
            { title: "Overdue Tasks", value: metrics.overdueTasks, icon: AlertTriangle, variant: "danger", changeType: "positive" as const },
            { title: "Clocked In", value: metrics.clockedInEmployees, icon: Clock, variant: "warning", changeType: "neutral" as const },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
            >
              <StatCard
                title={stat.title}
                value={stat.value}
                changeType={stat.changeType}
                icon={stat.icon}
                variant={stat.variant as any}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Section with fade-in animation */}
        <motion.div 
          className="w-full overflow-x-auto pb-1"
          variants={itemVariants}
        >
          <div className="min-w-[300px] sm:min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <TaskCharts />
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom Section with animated cards */}
        <motion.div 
          className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-2"
          variants={containerVariants}
        >
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            className="transition-all duration-300"
          >
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl">
              <RecentTasksList />
            </div>
          </motion.div>
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            className="transition-all duration-300"
          >
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl">
              <ActiveEmployees />
            </div>
          </motion.div>
        </motion.div>

        {/* API Error Message with animation */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="rounded-md bg-destructive/10 p-3 sm:p-4 border border-destructive/20"
            >
              <p className="text-xs sm:text-sm text-destructive break-words flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {apiError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

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

export default Dashboard;