import { useEffect, useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/admin/apiClient";

type ImportJob = {
  id: string;
  status: "running" | "completed" | "failed";
  stage: string;
  startedAt: string;
  updatedAt: string;
  error: string | null;
  result: any;
};

export default function AsanaImport() {
  const [token, setToken] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await apiFetch<{ ok: true; job: ImportJob }>(`/api/asana-import/status/${encodeURIComponent(id)}`);
        setJob(res.job);
        if (res.job.status === "completed") {
          setSuccess("Import completed successfully");
          setLoading(false);
          stopPolling();
        }
        if (res.job.status === "failed") {
          setError(res.job.error || "Import failed");
          setLoading(false);
          stopPolling();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load import status");
        setLoading(false);
        stopPolling();
      }
    }, 1500);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const onStart = async () => {
    setError(null);
    setSuccess(null);
    setJob(null);

    if (!token.trim() || !clientSecret.trim()) {
      setError("Asana token and Client Secret ID are required");
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch<{ ok: true; jobId: string }>("/api/asana-import/start", {
        method: "POST",
        body: JSON.stringify({ token: token.trim(), clientSecret: clientSecret.trim() }),
      });
      setJobId(res.jobId);
      startPolling(res.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start import");
      setLoading(false);
    }
  };

  const onTestConnection = async () => {
    setError(null);
    setSuccess(null);

    if (!token.trim()) {
      setError("Asana token is required");
      return;
    }

    try {
      setTesting(true);
      const res = await apiFetch<{ ok: true; user: any; workspace: any }>("/api/asana-import/test", {
        method: "POST",
        body: JSON.stringify({ token: token.trim(), clientSecret: clientSecret.trim() || undefined }),
      });

      const userName = res.user?.name ? String(res.user.name) : "";
      const wsName = res.workspace?.name ? String(res.workspace.name) : "";
      const msg = wsName
        ? `Connection OK. User: ${userName || "—"}. Workspace: ${wsName}`
        : `Connection OK. User: ${userName || "—"}.`;
      setSuccess(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test connection failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        <div className="space-y-1.5 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Import from Asana</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
            Start a one-time migration of Asana workspace data into Task Manager.
          </p>
        </div>

        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Migration Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6 pb-5 sm:pb-6 pt-0">
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium">Asana Personal Access Token</label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="paste token here"
                className="h-9 sm:h-10 text-sm sm:text-base"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium">Client Secret ID</label>
              <Input
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="client secret / workspace gid"
                className="h-9 sm:h-10 text-sm sm:text-base"
                disabled={loading || testing}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-destructive break-words">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-100 p-3 flex items-start gap-2 dark:bg-green-900/30">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5 dark:text-green-400" />
                <p className="text-xs sm:text-sm text-green-800 dark:text-green-400 break-words">{success}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
              <Button
                onClick={onStart}
                disabled={loading || testing}
                className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Start Import"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onTestConnection}
                disabled={loading || testing}
                className="w-full sm:w-auto"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setToken("");
                  setClientSecret("");
                  setJobId(null);
                  setJob(null);
                  setError(null);
                  setSuccess(null);
                  stopPolling();
                }}
                disabled={loading || testing}
                className="w-full sm:w-auto"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Import Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 sm:px-6 pb-5 sm:pb-6 pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground break-words">Job ID: {jobId || "—"}</p>
            <p className="text-xs sm:text-sm text-muted-foreground break-words">Stage: {job?.stage || "—"}</p>
            <p className="text-xs sm:text-sm text-muted-foreground break-words">Status: {job?.status || "—"}</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
