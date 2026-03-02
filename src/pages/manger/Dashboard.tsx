import { motion } from "framer-motion";
import { StatCard } from "@/components/manger/dashboard/StatCard";
import { TaskList } from "@/components/manger/dashboard/TaskList";
import { EmployeeActivity } from "@/components/manger/dashboard/EmployeeActivity";
import { ScheduleOverview } from "@/components/manger/dashboard/ScheduleOverview";
import { ClipboardList, Users, Clock, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/manger/api";
import { useQuery } from "@tanstack/react-query";
import { getAuthState } from "@/lib/auth";

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

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
};

const statsGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const statCardVariants = {
  hidden: { scale: 0.8, opacity: 0, y: 30 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20,
    },
  },
};

const contentVariants = {
  hidden: { opacity: 0, y: 40 },
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

const scheduleVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      delay: 0.6,
    },
  },
};

export default function Dashboard() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      return apiFetch<{
        activeTasks: number;
        dueToday: number;
        overdueTasks: number;
        employeesWorking: number;
        employeeTotal: number;
        hoursLoggedToday: number;
        avgHoursPerEmployee: number;
      }>("/api/dashboard/summary");
    },
  });

  const summary = summaryQuery.data;
  const auth = getAuthState();
  const displayName = (auth.username || "Sarah").split(" ")[0];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-5 sm:space-y-6 lg:space-y-8"
    >
      {/* Welcome + top cards container */}
      <motion.div
        variants={headerVariants}
        className="rounded-2xl bg-white/90 shadow-floating border border-white/60 overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200/70">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            Welcome,{" "}
            <span className="text-[#0b5ed7]">
              {displayName}
              !
            </span>
          </h1>
        </div>

        {/* Stat summary row */}
        <motion.div
          variants={statsGridVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5"
        >
          <motion.div variants={statCardVariants} whileHover="hover">
            <StatCard
              title="Tasks Assigned"
              value={summary ? summary.activeTasks : "—"}
              subtitle={summary ? `${summary.dueToday} due today` : "Loading..."}
              icon={ClipboardList}
              variant="default"
            />
          </motion.div>

          <motion.div variants={statCardVariants} whileHover="hover">
            <StatCard
              title="Shifts Today"
              value={summary ? summary.employeesWorking : "—"}
              subtitle={summary ? `Out of ${summary.employeeTotal} employees` : "Loading..."}
              icon={Clock}
              variant="default"
            />
          </motion.div>

          <motion.div variants={statCardVariants} whileHover="hover">
            <StatCard
              title="Locations"
              value={summary ? summary.employeeTotal : "—"}
              subtitle="Active locations"
              icon={Users}
              variant="default"
            />
          </motion.div>

          <motion.div variants={statCardVariants} whileHover="hover">
            <StatCard
              title="New Hires"
              value={summary ? summary.overdueTasks : "—"}
              subtitle="This week"
              icon={AlertCircle}
              variant="default"
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Middle cards: Priority tasks + upcoming shifts */}
      <motion.div
        variants={contentVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6"
      >
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            delay: 0.35,
          }}
        >
          <TaskList />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            delay: 0.4,
          }}
        >
          <ScheduleOverview />
        </motion.div>
      </motion.div>

      {/* Employee activity strip below */}
      <motion.div variants={scheduleVariants}>
        <EmployeeActivity />
      </motion.div>
    </motion.div>
  );
}