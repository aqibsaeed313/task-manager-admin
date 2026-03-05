import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/manger/ui/badge";
import { apiFetch } from "@/lib/manger/api";

type TimeEntry = {
  id: string;
  employee: string;
  location: string;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
};

type TimeEntryApi = {
  _id: string;
  employee?: string;
  location?: string;
  date?: string;
  clockIn?: string;
  clockOut?: string;
  status?: string;
};

function normalizeEntry(e: TimeEntryApi): TimeEntry {
  return {
    id: e._id,
    employee: String(e.employee || "").trim(),
    location: String(e.location || ""),
    date: String(e.date || ""),
    clockIn: String(e.clockIn || ""),
    clockOut: String(e.clockOut || ""),
    status: String(e.status || ""),
  };
}

function formatEntryDate(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (m) return m[0];
  const d = new Date(raw);
  if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  return raw;
}

export default function EmployeeTimeHistory() {
  const { employee } = useParams();
  const employeeName = String(employee || "").trim();

  const historyQuery = useQuery({
    queryKey: ["time-entries", "history", employeeName],
    enabled: Boolean(employeeName),
    queryFn: async () => {
      const res = await apiFetch<{ items: TimeEntryApi[] }>(
        `/api/time-entries?employee=${encodeURIComponent(employeeName)}`,
      );
      return (res.items || []).map(normalizeEntry);
    },
  });

  const rows = historyQuery.data ?? [];

  const title = useMemo(() => {
    return employeeName ? `${employeeName} - History` : "History";
  }, [employeeName]);

  return (
    <div className="space-y-6">
      <div className="page-header mb-0">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">Check-in / check-out history</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        {historyQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading history...</div>
        ) : historyQuery.isError ? (
          <div className="text-sm text-destructive">
            {historyQuery.error instanceof Error
              ? historyQuery.error.message
              : "Failed to load history"}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No history found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className="animate-fade-in" style={{ animationDelay: `${idx * 15}ms` }}>
                    <td>
                      <span className="text-muted-foreground whitespace-nowrap">{formatEntryDate(r.date)}</span>
                    </td>
                    <td>
                      <span className="font-medium text-foreground whitespace-nowrap">{r.clockIn || "—"}</span>
                    </td>
                    <td>
                      <span className="font-medium text-foreground whitespace-nowrap">{r.clockOut || "—"}</span>
                    </td>
                    <td>
                      <span className="text-muted-foreground whitespace-nowrap">{r.location || "—"}</span>
                    </td>
                    <td>
                      <Badge variant="secondary" className="text-xs capitalize whitespace-nowrap">
                        {r.status || "—"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
