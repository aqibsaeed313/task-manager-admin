import { MapPin, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/manger/api";

interface ScheduleItem {
  id: string;
  location: string;
  assignedCount: number;
  totalSlots: number;
  timeRange: string;
  tasks: number;
}

type EventApi = {
  _id?: string;
  id?: string;
  day?: string;
  title?: string;
  assignee?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
};

function todayDayAbbr() {
  const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayMap[new Date().getDay()] || "Mon";
}

export function ScheduleOverview() {
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await apiFetch<{ items: EventApi[] }>("/api/events");
      return Array.isArray(res?.items) ? res.items : [];
    },
  });

  const day = todayDayAbbr();
  const events = (eventsQuery.data || []).filter((e) => String(e.day || "") === day);

  const grouped: Record<string, EventApi[]> = {};
  for (const e of events) {
    const loc = String(e.location || "").trim() || "Unknown";
    grouped[loc] = grouped[loc] || [];
    grouped[loc].push(e);
  }

  const schedules: ScheduleItem[] = Object.keys(grouped)
    .sort()
    .slice(0, 4)
    .map((loc) => {
      const items = grouped[loc];
      const assignees = new Set(items.map((x) => String(x.assignee || "")).filter(Boolean));
      const assignedCount = assignees.size;
      const start = items.map((x) => String(x.startTime || "").trim()).filter(Boolean).sort()[0] || "";
      const end = items.map((x) => String(x.endTime || "").trim()).filter(Boolean).sort().slice(-1)[0] || "";
      const timeRange = start && end ? `${start} - ${end}` : start || end || "";

      return {
        id: loc,
        location: loc,
        assignedCount,
        totalSlots: Math.max(assignedCount, 1),
        timeRange,
        tasks: items.length,
      };
    });

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 bg-slate-50">
        <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
          Upcoming Shifts
        </h3>
      </div>
      <div className="p-3 sm:p-4 grid gap-3">
        {schedules.map((schedule, index) => (
          <div
            key={schedule.id}
            className="p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground truncate">
                  {schedule.location}
                </span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {schedule.timeRange}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {schedule.assignedCount}/{schedule.totalSlots} assigned
                  </span>
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {schedule.tasks} tasks
                </span>
              </div>
              <div className="w-full sm:w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${(schedule.assignedCount / schedule.totalSlots) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
