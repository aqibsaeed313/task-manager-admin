import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Progress } from "@/components/admin/ui/progress";
import { Badge } from "@/components/admin/ui/badge";
import { AlertCircle, Check, Loader2, Download, Users, Building2, FolderGit2, CheckSquare, MessageSquare, Paperclip, FileCheck, Clock, BarChart3, Sparkles, Zap, TrendingUp, Database, CloudDownload } from "lucide-react";
import { apiFetch } from "@/lib/admin/apiClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type ImportJob = {
  id: string;
  status: "running" | "completed" | "failed" | "timeout";
  stage: string;
  startedAt: string;
  updatedAt: string;
  error: string | null;
  result: {
    imported?: {
      users?: number;
      workspaces?: number;
      projects?: number;
      tasks?: number;
      subtasks?: number;
      comments?: number;
      attachments?: number;
      downloadedAttachments?: number;
    };
  } | null;
  progress?: Record<string, string>;
};

export default function AsanaImport() {
  const [token, setToken] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Define import stages with user-friendly labels
  const importStages = useMemo(() => [
    { key: "users", label: "Team Members", icon: Users, fetch: "users_fetch_done", save: "users_save_done" },
    { key: "workspaces", label: "Workspaces", icon: Building2, fetch: "workspaces_fetch_done", save: "workspaces_save_done" },
    { key: "projects", label: "Projects", icon: FolderGit2, fetch: "projects_fetch_done", save: "projects_save_done" },
    { key: "tasks", label: "Tasks", icon: CheckSquare, fetch: "tasks_fetch_done", save: "tasks_save_done" },
    { key: "subtasks", label: "Subtasks", icon: CheckSquare, fetch: "subtasks_fetch_done", save: "subtasks_save_done" },
    { key: "comments", label: "Comments", icon: MessageSquare, fetch: "comments_fetch_done", save: "comments_save_done" },
    { key: "attachments", label: "Attachments", icon: Paperclip, fetch: "attachments_fetch_done", save: "attachments_download_done" },
  ], []);

  // Calculate overall progress percentage
  const progressPercent = useMemo(() => {
    if (!job?.stage) return 0;
    if (job.status === "completed") return 100;
    if (job.status === "failed" || job.status === "timeout") return 0;
    
    const stageIndex = importStages.findIndex(s => 
      job.stage === s.fetch || 
      job.stage === s.save || 
      job.stage?.includes(s.key)
    );
    
    if (stageIndex === -1) return 0;
    
    // Each stage is worth ~14% (7 stages = ~100%)
    const baseProgress = (stageIndex / importStages.length) * 100;
    const withinStage = job.stage?.includes("save") ? 0.5 : 0;
    
    return Math.min(Math.round(baseProgress + withinStage * 14), 99);
  }, [job, importStages]);

  // Get current stage details
  const currentStage = useMemo(() => {
    if (!job?.stage) return null;
    return importStages.find(s => 
      job.stage === s.fetch || 
      job.stage === s.save || 
      job.stage?.includes(s.key)
    );
  }, [job, importStages]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "running": return "bg-blue-500";
      case "failed": return "bg-red-500";
      case "timeout": return "bg-yellow-500";
      default: return "bg-gray-300";
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return { variant: "default" as const, label: "Completed", className: "bg-green-100 text-green-800 hover:bg-green-100" };
      case "running": return { variant: "default" as const, label: "Importing...", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" };
      case "failed": return { variant: "destructive" as const, label: "Failed", className: "" };
      case "timeout": return { variant: "secondary" as const, label: "Timed Out", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" };
      default: return { variant: "secondary" as const, label: "Waiting", className: "" };
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    setElapsedTime(0);
    
    // Start elapsed time timer
    timerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await apiFetch<{ ok: true; job: ImportJob }>(`/api/asana-import/status/${encodeURIComponent(id)}`);
        setJob(res.job);
        if (res.job.status === "completed") {
          setSuccess("Import completed successfully!");
          setLoading(false);
          stopPolling();
        }
        if (res.job.status === "failed") {
          setError(res.job.error || "Import failed");
          setLoading(false);
          stopPolling();
        }
        if (res.job.status === "timeout") {
          setError("Import timed out after 30 minutes");
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
    setElapsedTime(0);

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
                  setElapsedTime(0);
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

        {/* Enhanced Import Status Card */}
        <AnimatePresence>
          {job && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Card className="shadow-soft border-0 sm:border overflow-hidden bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-950 dark:to-blue-950/20">
                {/* Animated Header Background */}
                <div className="relative overflow-hidden">
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"
                    animate={{ 
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    style={{ backgroundSize: "200% 200%" }}
                  />
                  <CardHeader className="relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/90 dark:to-indigo-950/90 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: job.status === "running" ? 360 : 0 }}
                          transition={{ duration: 2, repeat: job.status === "running" ? Infinity : 0, ease: "linear" }}
                        >
                          <CloudDownload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </motion.div>
                        <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                          Import Progress
                        </span>
                      </CardTitle>
                      {job.status && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Badge className={`${getStatusBadge(job.status).className} shadow-sm`} variant={getStatusBadge(job.status).variant}>
                            <span className="flex items-center gap-1">
                              {job.status === "running" && (
                                <motion.span
                                  animate={{ opacity: [1, 0.5, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  <Zap className="h-3 w-3" />
                                </motion.span>
                              )}
                              {getStatusBadge(job.status).label}
                            </span>
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                  </CardHeader>
                </div>
                
                <CardContent className="space-y-6 px-4 sm:px-6 py-5 sm:py-6">
                  {/* Animated Progress Ring & Bar */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Circular Progress */}
                    <motion.div 
                      className="relative w-24 h-24 flex-shrink-0"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                      <svg className="w-24 h-24 transform -rotate-90">
                        {/* Background circle */}
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        {/* Progress circle */}
                        <motion.circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          fill="transparent"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          initial={{ strokeDashoffset: `${2 * Math.PI * 40}` }}
                          animate={{ strokeDashoffset: `${2 * Math.PI * 40 * (1 - progressPercent / 100)}` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.span 
                          className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                          key={progressPercent}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          {progressPercent}%
                        </motion.span>
                      </div>
                    </motion.div>

                    {/* Progress Details */}
                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Overall Progress
                        </span>
                        <motion.span 
                          className="text-sm font-semibold text-blue-600 dark:text-blue-400"
                          key={progressPercent}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                        >
                          {progressPercent}% Complete
                        </motion.span>
                      </div>
                      <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                        {job.status === "running" && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </div>
                      {job.status === "running" && currentStage && (
                        <motion.p 
                          className="text-xs text-muted-foreground flex items-center gap-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={currentStage.label}
                        >
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="h-3 w-3 text-blue-500" />
                          </motion.span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Currently importing: {currentStage.label}
                          </span>
                        </motion.p>
                      )}
                    </div>
                  </div>

                  {/* Animated Elapsed Time Card */}
                  {job.status === "running" && (
                    <motion.div 
                      className="flex items-center justify-between text-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-3 rounded-xl border border-blue-200 dark:border-blue-800"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ pulse: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Clock className="h-4 w-4 text-blue-600" />
                        </motion.div>
                        <span className="text-muted-foreground">Elapsed time</span>
                      </div>
                      <motion.span 
                        className="font-mono font-semibold text-blue-700 dark:text-blue-400 text-lg"
                        key={elapsedTime}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                      >
                        {formatElapsedTime(elapsedTime)}
                      </motion.span>
                    </motion.div>
                  )}

                  {/* Animated Import Steps - Horizontal Timeline */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Import Stages
                    </h4>
                    <div className="relative">
                      {/* Connecting Line */}
                      <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      <motion.div 
                        className="absolute top-6 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(importStages.findIndex(s => job.stage?.includes(s.key) || job.stage === s.fetch || job.stage === s.save) / (importStages.length - 1)) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                      
                      <div className="grid grid-cols-7 gap-2">
                        {importStages.map((stage, index) => {
                          const isCompleted = job.progress?.[stage.save] || 
                            (job.result?.imported && index < importStages.findIndex(s => job.stage?.includes(s.key))) ||
                            job.status === "completed";
                          const isCurrent = job.stage === stage.fetch || job.stage === stage.save || job.stage?.includes(stage.key);
                          
                          const StageIcon = stage.icon;
                          
                          return (
                            <motion.div 
                              key={stage.key}
                              className="flex flex-col items-center relative"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              {/* Icon Circle */}
                              <motion.div
                                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 relative ${
                                  isCompleted 
                                    ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30" 
                                    : isCurrent 
                                      ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-200 dark:ring-blue-900/50" 
                                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400"
                                }`}
                                animate={isCurrent ? { 
                                  scale: [1, 1.1, 1],
                                  boxShadow: [
                                    "0 4px 14px rgba(59, 130, 246, 0.3)",
                                    "0 8px 25px rgba(59, 130, 246, 0.5)",
                                    "0 4px 14px rgba(59, 130, 246, 0.3)"
                                  ]
                                } : {}}
                                transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0 }}
                              >
                                <AnimatePresence mode="wait">
                                  {isCompleted ? (
                                    <motion.div
                                      key="check"
                                      initial={{ scale: 0, rotate: -180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      exit={{ scale: 0, rotate: 180 }}
                                    >
                                      <FileCheck className="h-5 w-5" />
                                    </motion.div>
                                  ) : isCurrent ? (
                                    <motion.div
                                      key="loader"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                      <Loader2 className="h-5 w-5" />
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      key="icon"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                    >
                                      <StageIcon className="h-4 w-4" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                              
                              {/* Label */}
                              <motion.span 
                                className={`text-[10px] mt-2 text-center font-medium leading-tight ${
                                  isCompleted 
                                    ? "text-green-600 dark:text-green-400" 
                                    : isCurrent 
                                      ? "text-blue-600 dark:text-blue-400" 
                                      : "text-gray-400"
                                }`}
                                animate={isCurrent ? { opacity: [0.7, 1, 0.7] } : {}}
                                transition={{ duration: 2, repeat: isCurrent ? Infinity : 0 }}
                              >
                                {stage.label}
                              </motion.span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Animated Data Stats Grid */}
                  {job.result?.imported && (
                    <motion.div 
                      className="grid grid-cols-4 gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {[
                        { label: "Users", value: job.result.imported.users || 0, icon: Users, color: "blue" },
                        { label: "Projects", value: job.result.imported.projects || 0, icon: FolderGit2, color: "indigo" },
                        { label: "Tasks", value: (job.result.imported.tasks || 0) + (job.result.imported.subtasks || 0), icon: CheckSquare, color: "purple" },
                        { label: "Comments", value: job.result.imported.comments || 0, icon: MessageSquare, color: "pink" },
                      ].map((stat, idx) => (
                        <motion.div
                          key={stat.label}
                          className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100/50 dark:from-${stat.color}-950/30 dark:to-${stat.color}-900/20 p-3 rounded-xl border border-${stat.color}-200 dark:border-${stat.color}-800`}
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                        >
                          <stat.icon className={`h-4 w-4 text-${stat.color}-500 mb-1`} />
                          <motion.div 
                            className={`text-xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}
                            key={stat.value}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          >
                            {stat.value.toLocaleString()}
                          </motion.div>
                          <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Visual Import Progress Chart */}
              {job.status !== "failed" && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Data Import Visualization
                  </h4>
                  <div className="h-48 sm:h-56 w-full bg-muted/30 rounded-lg p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { 
                            name: "Team", 
                            label: "Team Members",
                            value: job.result?.imported?.users || 0, 
                            color: job.stage?.includes("users") ? "#3b82f6" : 
                                  job.result?.imported?.users ? "#22c55e" : "#e5e7eb"
                          },
                          { 
                            name: "Workspaces", 
                            label: "Workspaces",
                            value: job.result?.imported?.workspaces || 0, 
                            color: job.stage?.includes("workspaces") ? "#3b82f6" : 
                                  job.result?.imported?.workspaces ? "#22c55e" : "#e5e7eb"
                          },
                          { 
                            name: "Projects", 
                            label: "Projects",
                            value: job.result?.imported?.projects || 0, 
                            color: job.stage?.includes("projects") ? "#3b82f6" : 
                                  job.result?.imported?.projects ? "#22c55e" : "#e5e7eb"
                          },
                          { 
                            name: "Tasks", 
                            label: "Tasks",
                            value: job.result?.imported?.tasks || 0, 
                            color: job.stage?.includes("tasks") && !job.stage?.includes("subtasks") ? "#3b82f6" : 
                                  job.result?.imported?.tasks ? "#22c55e" : "#e5e7eb"
                          },
                          { 
                            name: "Subtasks", 
                            label: "Subtasks",
                            value: job.result?.imported?.subtasks || 0, 
                            color: job.stage?.includes("subtasks") ? "#3b82f6" : 
                                  job.result?.imported?.subtasks ? "#22c55e" : "#e5e7eb"
                          },
                          { 
                            name: "Comments", 
                            label: "Comments",
                            value: job.result?.imported?.comments || 0, 
                            color: job.stage?.includes("comments") ? "#3b82f6" : 
                                  job.result?.imported?.comments ? "#22c55e" : "#e5e7eb"
                          },
                          { 
                            name: "Files", 
                            label: "Attachments",
                            value: job.result?.imported?.attachments || 0, 
                            color: job.stage?.includes("attachments") ? "#3b82f6" : 
                                  job.result?.imported?.attachments ? "#22c55e" : "#e5e7eb"
                          },
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }} 
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            value, 
                            props.payload.label
                          ]}
                          labelStyle={{ fontSize: 12 }}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: 12
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {[
                            { 
                              name: "Team", 
                              label: "Team Members",
                              value: job.result?.imported?.users || 0, 
                              color: job.stage?.includes("users") ? "#3b82f6" : 
                                    job.result?.imported?.users ? "#22c55e" : "#e5e7eb"
                            },
                            { 
                              name: "Workspaces", 
                              label: "Workspaces",
                              value: job.result?.imported?.workspaces || 0, 
                              color: job.stage?.includes("workspaces") ? "#3b82f6" : 
                                    job.result?.imported?.workspaces ? "#22c55e" : "#e5e7eb"
                            },
                            { 
                              name: "Projects", 
                              label: "Projects",
                              value: job.result?.imported?.projects || 0, 
                              color: job.stage?.includes("projects") ? "#3b82f6" : 
                                    job.result?.imported?.projects ? "#22c55e" : "#e5e7eb"
                            },
                            { 
                              name: "Tasks", 
                              label: "Tasks",
                              value: job.result?.imported?.tasks || 0, 
                              color: job.stage?.includes("tasks") && !job.stage?.includes("subtasks") ? "#3b82f6" : 
                                    job.result?.imported?.tasks ? "#22c55e" : "#e5e7eb"
                            },
                            { 
                              name: "Subtasks", 
                              label: "Subtasks",
                              value: job.result?.imported?.subtasks || 0, 
                              color: job.stage?.includes("subtasks") ? "#3b82f6" : 
                                    job.result?.imported?.subtasks ? "#22c55e" : "#e5e7eb"
                            },
                            { 
                              name: "Comments", 
                              label: "Comments",
                              value: job.result?.imported?.comments || 0, 
                              color: job.stage?.includes("comments") ? "#3b82f6" : 
                                    job.result?.imported?.comments ? "#22c55e" : "#e5e7eb"
                            },
                            { 
                              name: "Files", 
                              label: "Attachments",
                              value: job.result?.imported?.attachments || 0, 
                              color: job.stage?.includes("attachments") ? "#3b82f6" : 
                                    job.result?.imported?.attachments ? "#22c55e" : "#e5e7eb"
                            },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs justify-center">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-500"></div>
                      <span className="text-muted-foreground">Currently Importing</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500"></div>
                      <span className="text-muted-foreground">Completed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gray-200"></div>
                      <span className="text-muted-foreground">Pending</span>
                    </div>
                  </div>
                </div>
              )}

                  {/* Import Results Summary */}
              {job.status === "completed" && job.result?.imported && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-green-800 dark:text-green-400 flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    Import Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                    {job.result.imported.users !== undefined && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Team Members:</span>
                        <span className="font-semibold">{job.result.imported.users}</span>
                      </div>
                    )}
                    {job.result.imported.workspaces !== undefined && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Workspaces:</span>
                        <span className="font-semibold">{job.result.imported.workspaces}</span>
                      </div>
                    )}
                    {job.result.imported.projects !== undefined && (
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Projects:</span>
                        <span className="font-semibold">{job.result.imported.projects}</span>
                      </div>
                    )}
                    {job.result.imported.tasks !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Tasks:</span>
                        <span className="font-semibold">{job.result.imported.tasks}</span>
                      </div>
                    )}
                    {job.result.imported.subtasks !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Subtasks:</span>
                        <span className="font-semibold">{job.result.imported.subtasks}</span>
                      </div>
                    )}
                    {job.result.imported.comments !== undefined && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Comments:</span>
                        <span className="font-semibold">{job.result.imported.comments}</span>
                      </div>
                    )}
                    {job.result.imported.attachments !== undefined && (
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Attachments:</span>
                        <span className="font-semibold">{job.result.imported.attachments}</span>
                      </div>
                    )}
                    {job.result.imported.downloadedAttachments !== undefined && (
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Downloaded:</span>
                        <span className="font-semibold">{job.result.imported.downloadedAttachments}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

                  {/* Job Details Footer */}
                  <motion.div 
                    className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-4 border-t border-gray-200 dark:border-gray-700"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      Job ID: <code className="bg-muted px-2 py-0.5 rounded font-mono">{job.id || jobId}</code>
                    </span>
                    {job.startedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Started: {new Date(job.startedAt).toLocaleString()}
                      </span>
                    )}
                    {job.status === "running" && job.stage && (
                      <span className="flex items-center gap-1 capitalize">
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-blue-500"
                        />
                        Current step: {job.stage.replace(/_/g, " ")}
                      </span>
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
