import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/manger/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";

type BugStatus = "open" | "closed";

type BugItem = {
  id: string;
  title: string;
  description: string;
  status?: BugStatus;
  taskTitle?: string;
  createdByUsername?: string;
  createdByRole?: string;
  createdAt?: string;
  source?: { panel?: string; path?: string };
  attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
};

function toText(v: unknown) {
  return typeof v === "string" ? v : "";
}

export default function Bugs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [items, setItems] = useState<BugItem[]>(() => []);

  const [q, setQ] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<BugItem | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    const res = await apiFetch<{ items?: any[] }>("/api/bugs");
    const list = Array.isArray(res?.items) ? res.items : [];
    const mapped: BugItem[] = list
      .map((x: any) => ({
        id: String(x.id || x._id || ""),
        title: toText(x.title),
        description: toText(x.description),
        status: (x.status === "closed" ? "closed" : "open") as BugStatus,
        taskTitle: toText(x.taskTitle),
        createdByUsername: toText(x.createdByUsername),
        createdByRole: toText(x.createdByRole),
        createdAt: toText(x.createdAt),
        source: x.source && typeof x.source === "object" ? x.source : undefined,
        attachment: x.attachment && typeof x.attachment === "object" ? x.attachment : undefined,
      }))
      .filter((x) => Boolean(x.id));

    setItems(mapped);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setApiError(null);
        await load();
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load bugs");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const viewId = String(searchParams.get("view") || "").trim();
    if (!viewId) return;

    const found = items.find((x) => x.id === viewId);
    if (!found) return;

    setSelected(found);
    setViewOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("view");
    setSearchParams(next, { replace: true });
  }, [items, searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((b) => {
      const where = `${b.title} ${b.description} ${b.taskTitle || ""} ${b.createdByUsername || ""} ${b.source?.path || ""}`.toLowerCase();
      return where.includes(query);
    });
  }, [items, q]);

  const openBug = (b: BugItem) => {
    setSelected(b);
    setViewOpen(true);
  };

  const updateStatus = async (next: BugStatus) => {
    if (!selected) return;
    try {
      setUpdating(true);
      setApiError(null);
      const res = await apiFetch<{ item?: any }>(`/api/bugs/${encodeURIComponent(selected.id)}`, {
        method: "PUT",
        body: JSON.stringify({ status: next }),
      });
      const updated = res?.item;
      const merged: BugItem = {
        ...selected,
        status: (updated?.status === "closed" ? "closed" : "open") as BugStatus,
      };
      setSelected(merged);
      setItems((prev) => prev.map((x) => (x.id === merged.id ? { ...x, status: merged.status } : x)));
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update bug");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
        <div className="space-y-1.5 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Developer Bugs</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">Bugs reported from the system.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading} className="w-full sm:w-auto">
          Refresh
        </Button>
      </div>

      {apiError && (
        <div className="rounded-md bg-destructive/10 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-destructive break-words">{apiError}</p>
        </div>
      )}

      <Card className="shadow-soft border-0 sm:border">
        <CardContent className="p-3 sm:p-6">
          <div className="relative w-full sm:max-w-md">
            <Input
              placeholder="Search bugs..."
              className="h-9 sm:h-10 text-sm sm:text-base"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-0 sm:border">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
          <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Bugs ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <div className="text-xs sm:text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">Title</TableHead>
                    <TableHead className="text-xs md:text-sm">Status</TableHead>
                    <TableHead className="text-xs md:text-sm">Posted By</TableHead>
                    <TableHead className="text-xs md:text-sm">Where</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openBug(b)}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm md:text-base line-clamp-1">{b.title}</p>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">{b.taskTitle ? `Task: ${b.taskTitle}` : ""}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.status === "closed" ? "secondary" : "default"} className="text-xs md:text-sm">
                          {b.status === "closed" ? "Closed" : "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm text-muted-foreground">
                        {b.createdByUsername || "-"}
                        {b.createdByRole ? ` (${b.createdByRole})` : ""}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm text-muted-foreground">{b.source?.path || b.source?.panel || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[95vw] max-w-3xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">{selected?.title || "Bug"}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{selected?.source?.path || selected?.source?.panel || ""}</DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={selected.status === "closed" ? "secondary" : "default"}>
                    {selected.status === "closed" ? "Closed" : "Open"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selected.createdByUsername ? `Posted by ${selected.createdByUsername}` : ""}
                    {selected.createdByRole ? ` (${selected.createdByRole})` : ""}
                  </span>
                </div>
              </div>

              <div className="rounded-md border p-3 bg-white">
                <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
              </div>

              {selected.attachment?.url ? (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium">Attachment</p>
                  <div className="w-full overflow-hidden rounded-lg border bg-white">
                    <img
                      src={String(selected.attachment.url)}
                      alt={String(selected.attachment.fileName || "Bug attachment")}
                      className="w-full h-auto max-h-[65vh] object-contain"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button variant="outline" onClick={() => setViewOpen(false)} className="w-full sm:w-auto" disabled={updating}>
              Close
            </Button>
            {selected?.status === "closed" ? (
              <Button onClick={() => void updateStatus("open")} className="w-full sm:w-auto" disabled={updating}>
                Reopen
              </Button>
            ) : (
              <Button onClick={() => void updateStatus("closed")} className="w-full sm:w-auto" disabled={updating}>
                Mark Closed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
