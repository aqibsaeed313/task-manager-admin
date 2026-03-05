import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";
import { apiFetch } from "@/lib/admin/apiClient";

type TimeEntry = {
  id: string;
  employee: string;
  location: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: string;
};

type TimeEntryApi = {
  id?: string;
  _id?: string;
  employee?: string;
  location?: string;
  date?: string;
  clockIn?: string;
  clockOut?: string | null;
  status?: string;
};

function normalizeTimeEntry(e: TimeEntryApi): TimeEntry {
  return {
    id: String((e as any).id || e._id || ""),
    employee: String(e.employee || "").trim(),
    location: String(e.location || ""),
    date: String(e.date || ""),
    clockIn: String(e.clockIn || ""),
    clockOut: e.clockOut === null ? null : String(e.clockOut || "") || null,
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
      return (res.items || []).map(normalizeTimeEntry);
    },
  });

  const rows = historyQuery.data ?? [];

  const title = useMemo(() => {
    return employeeName ? `${employeeName} - History` : "History";
  }, [employeeName]);

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
            Check-in / check-out history
          </p>
        </div>

        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Entries ({rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-5 sm:pb-6">
            {historyQuery.isLoading ? (
              <p className="text-xs sm:text-sm text-muted-foreground">Loading history...</p>
            ) : historyQuery.isError ? (
              <p className="text-xs sm:text-sm text-destructive">
                {historyQuery.error instanceof Error
                  ? historyQuery.error.message
                  : "Failed to load history"}
              </p>
            ) : rows.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">No history found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-2">Date</th>
                      <th className="py-2">Clock In</th>
                      <th className="py-2">Clock Out</th>
                      <th className="py-2">Location</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 text-sm">{formatEntryDate(r.date)}</td>
                        <td className="py-2 text-sm">{r.clockIn || "—"}</td>
                        <td className="py-2 text-sm">{r.clockOut || "—"}</td>
                        <td className="py-2 text-sm">{r.location || "—"}</td>
                        <td className="py-2 text-sm">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {r.status || "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
