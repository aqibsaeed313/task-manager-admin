import { StatCard } from "@/components/dashboard/StatCard";
import { TaskList } from "@/components/dashboard/TaskList";
import { EmployeeActivity } from "@/components/dashboard/EmployeeActivity";
import { ScheduleOverview } from "@/components/dashboard/ScheduleOverview";
import { ClipboardList, Users, MapPin, Clock } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total Tasks"
          value={0}
          icon={ClipboardList}
          subtitle=""
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Locations"
          value={0}
          icon={MapPin}
          subtitle=""
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="On Time"
          value="0%"
          icon={Clock}
          subtitle=""
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TaskList />
        </div>
        <div className="space-y-6">
          {/* EmployeeActivity removed */}
        </div>
      </div>

      <ScheduleOverview />
    </div>
  );
}
