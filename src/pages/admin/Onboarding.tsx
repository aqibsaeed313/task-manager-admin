import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Badge } from "@/components/admin/ui/badge";
import { Avatar, AvatarFallback } from "@/components/admin/ui/avatar";
import { Input } from "@/components/admin/ui/input";
import { Progress } from "@/components/admin/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import {
  Plus,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { createResource, listResource, updateResource, apiFetch } from "@/lib/admin/apiClient";

interface OnboardingEmployee {
  id: string;
  name: string;
  initials: string;
  email: string;
  startDate: string;
  progress: number;
  status: "pending" | "in-progress" | "completed" | "needs-review";
  approvalStatus: "pending" | "approved" | "rejected";
  employeeId?: string;
  w4FileName?: string;
  i9FileName?: string;
  signatureFileName?: string;
  generatedPdfFileName?: string;
  completedSteps: string[];
  pendingSteps: string[];
}

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: "active" | "inactive" | "on-leave";
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  status: "active" | "inactive" | "pending";
}

type BackendOnboarding = {
  id?: string;
  _id?: string;
  employeeName?: string;
  role?: string;
  startDate?: string;
  progress?: number;
  documentsUploaded?: number;
  documentsRequired?: number;
  approvalStatus?: "pending" | "approved" | "rejected" | string;
};

const statusClasses = {
  pending: "bg-muted text-muted-foreground",
  "in-progress": "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
  "needs-review": "bg-warning/10 text-warning",
};

const statusLabels = {
  pending: "Not Started",
  "in-progress": "In Progress",
  completed: "Completed",
  "needs-review": "Needs Review",
};

const approvalClasses = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const allSteps = ["Personal Info", "W-4 Form", "I-9 Form", "Direct Deposit", "Handbook"];

const Onboarding = () => {
  const [startOnboardingOpen, setStartOnboardingOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<OnboardingEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [onboardingList, setOnboardingList] = useState<OnboardingEmployee[]>(() => []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    employeeId: "",
    email: "",
    startDate: "",
    status: "pending" as OnboardingEmployee["status"],
    w4FileName: "",
    i9FileName: "",
    signatureFileName: "",
    generatedPdfFileName: "",
  });

  const [w4File, setW4File] = useState<File | null>(null);
  const [i9File, setI9File] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [generatedPdfFile, setGeneratedPdfFile] = useState<File | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        
        // Fetch onboarding list
        const list = await listResource<BackendOnboarding>("onboarding");
        if (!mounted) return;
        setOnboardingList(list.map(normalizeOnboardingItem));
        
        // Fetch employees from employees API
        let allEmployees: Employee[] = [];
        try {
          const employeeList = await listResource<Employee>("employees");
          if (mounted) {
            allEmployees = employeeList.filter((e) => e.status === "active");
          }
        } catch (empErr) {
          console.error("Failed to load employees:", empErr);
        }
        
        // Fetch users with employee role from users API
        try {
          const userList = await listResource<User>("users");
          if (mounted) {
            const employeeUsers = userList
              .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
              .map((u) => ({
                id: u.id,
                name: u.name,
                initials: u.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase(),
                email: u.email,
                status: "active" as const,
              }));
            
            // Merge both lists (remove duplicates by email)
            employeeUsers.forEach((eu) => {
              if (!allEmployees.some((e) => e.email === eu.email)) {
                allEmployees.push(eu);
              }
            });
          }
        } catch (userErr) {
          console.error("Failed to load users:", userErr);
        }
        
        if (mounted) {
          setEmployees(allEmployees);
        }
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load onboarding");
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

  const refresh = async () => {
    const list = await listResource<BackendOnboarding>("onboarding");
    setOnboardingList(list.map(normalizeOnboardingItem));
  };

  const normalizeOnboardingItem = (item: BackendOnboarding): OnboardingEmployee => {
    const name = String(item.employeeName || "").trim();
    const initials = name
      ? name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "";

    const progress = typeof item.progress === "number" && Number.isFinite(item.progress) ? item.progress : 0;
    const documentsUploaded = typeof item.documentsUploaded === "number" ? item.documentsUploaded : 0;
    const documentsRequired = typeof item.documentsRequired === "number" ? item.documentsRequired : 0;

    let status: OnboardingEmployee["status"] = "pending";
    if (progress >= 100) status = "completed";
    else if (progress > 0) status = "in-progress";
    else if (documentsRequired > 0 && documentsUploaded > 0) status = "in-progress";

    const rawApproval = String(item.approvalStatus || "pending").toLowerCase();
    const approvalStatus: OnboardingEmployee["approvalStatus"] =
      rawApproval === "approved" ? "approved" : rawApproval === "rejected" ? "rejected" : "pending";

    const completedCount = Math.max(0, Math.min(allSteps.length, Math.round((progress / 100) * allSteps.length)));
    const completedSteps = allSteps.slice(0, completedCount);
    const pendingSteps = allSteps.slice(completedCount);

    return {
      id: String(item.id || item._id || ""),
      name,
      initials: initials || "U",
      email: "",
      startDate: String(item.startDate || ""),
      progress,
      status,
      approvalStatus,
      w4FileName: "",
      i9FileName: "",
      signatureFileName: "",
      generatedPdfFileName: "",
      completedSteps,
      pendingSteps,
    };
  };

  const summary = useMemo(() => {
    return {
      pending: onboardingList.filter((e) => e.status === "pending").length,
      inProgress: onboardingList.filter((e) => e.status === "in-progress").length,
      needsReview: onboardingList.filter((e) => e.status === "needs-review").length,
      completed: onboardingList.filter((e) => e.status === "completed").length,
    };
  }, [onboardingList]);

  const handleStartOnboarding = async () => {
    if (!formData.name || !formData.email || !formData.startDate) return;

    const initials = formData.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const isCompleted = formData.status === "completed";
    const isPending = formData.status === "pending";

    const next: OnboardingEmployee = {
      id: `ONB-${Date.now().toString().slice(-6)}`,
      name: formData.name,
      initials,
      email: formData.email,
      startDate: formData.startDate,
      progress: isCompleted ? 100 : 0,
      status: formData.status,
      approvalStatus: "pending",
      employeeId: formData.employeeId || undefined,
      w4FileName: formData.w4FileName || "",
      i9FileName: formData.i9FileName || "",
      signatureFileName: formData.signatureFileName || "",
      generatedPdfFileName: formData.generatedPdfFileName || "",
      completedSteps: isCompleted ? [...allSteps] : [],
      pendingSteps: isCompleted ? [] : isPending ? [...allSteps] : [...allSteps],
    };

    const hasFiles = w4File || i9File || signatureFile || generatedPdfFile;

    try {
      setApiError(null);

      if (hasFiles) {
        const fd = new FormData();
        fd.append("name", formData.name);
        fd.append("email", formData.email);
        fd.append("startDate", formData.startDate);
        fd.append("status", formData.status);
        fd.append("progress", String(isCompleted ? 100 : 0));
        fd.append("approvalStatus", "pending");
        if (w4File) fd.append("w4File", w4File);
        if (i9File) fd.append("i9File", i9File);
        if (signatureFile) fd.append("signatureFile", signatureFile);
        if (generatedPdfFile) fd.append("generatedPdfFile", generatedPdfFile);

        await apiFetch<{ item: BackendOnboarding }>("/api/onboarding/upload", {
          method: "POST",
          body: fd,
        });
      } else {
        await createResource<OnboardingEmployee>("onboarding", next);
      }

      await refresh();
      setStartOnboardingOpen(false);
      setFormData({
        name: "",
        employeeId: "",
        email: "",
        startDate: "",
        status: "pending",
        w4FileName: "",
        i9FileName: "",
        signatureFileName: "",
        generatedPdfFileName: "",
      });
      setW4File(null);
      setI9File(null);
      setSignatureFile(null);
      setGeneratedPdfFile(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to start onboarding");
    }
  };

  const setApproval = async (id: string, approvalStatus: OnboardingEmployee["approvalStatus"]) => {
    const employee = onboardingList.find((e) => e.id === id);
    if (!employee) return;
    try {
      setApiError(null);
      await updateResource<OnboardingEmployee>("onboarding", id, { ...employee, approvalStatus });
      await refresh();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update approval");
    }
    setSelectedEmployee((prev) => (prev && prev.id === id ? { ...prev, approvalStatus } : prev));
  };

  const handleViewDetails = (employee: OnboardingEmployee) => {
    setSelectedEmployee(employee);
    setViewDetailsOpen(true);
  };

  return (
    <AdminLayout>
      {/* Mobile-first container */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        
        {/* Page Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Employee Onboarding
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Track and manage new employee onboarding progress.
            </p>
          </div>

          {/* Start Onboarding Dialog */}
          <Dialog open={startOnboardingOpen} onOpenChange={setStartOnboardingOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start Onboarding</span>
              </Button>
            </DialogTrigger>
            
            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Start Onboarding</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new onboarding record for an employee
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4 sm:space-y-5">
                {/* Employee Name & Email */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Employee *</label>
                    <select
                      value={formData.employeeId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = employees.find((e) => e.id === empId);
                        setFormData({ ...formData, employeeId: empId, name: emp?.name || "", email: emp?.email || "" });
                      }}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                      required
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    {employees.length === 0 && (
                      <p className="text-xs text-warning mt-1">No employees found.</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                      required
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Start Date & Status */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Start Date *</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as OnboardingEmployee["status"] })
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
                    >
                      <option value="pending">Not Started</option>
                      <option value="in-progress">In Progress</option>
                      <option value="needs-review">Needs Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* W-4 & I-9 File Uploads */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">W-4 Document</label>
                    <div
                      className="w-full rounded-md border px-3 py-3 text-sm sm:text-base bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) {
                          setW4File(f);
                          setFormData({ ...formData, w4FileName: f.name });
                        }
                      }}
                      onClick={() => {
                        const el = document.getElementById("onboarding-w4-input") as HTMLInputElement | null;
                        el?.click();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const el = document.getElementById("onboarding-w4-input") as HTMLInputElement | null;
                          el?.click();
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {w4File ? w4File.name : "Click to choose or drag & drop"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Max 10MB
                          </p>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <input
                        id="onboarding-w4-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setW4File(f);
                          setFormData({ ...formData, w4FileName: f?.name || "" });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">I-9 Document</label>
                    <div
                      className="w-full rounded-md border px-3 py-3 text-sm sm:text-base bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) {
                          setI9File(f);
                          setFormData({ ...formData, i9FileName: f.name });
                        }
                      }}
                      onClick={() => {
                        const el = document.getElementById("onboarding-i9-input") as HTMLInputElement | null;
                        el?.click();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const el = document.getElementById("onboarding-i9-input") as HTMLInputElement | null;
                          el?.click();
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {i9File ? i9File.name : "Click to choose or drag & drop"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Max 10MB
                          </p>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <input
                        id="onboarding-i9-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setI9File(f);
                          setFormData({ ...formData, i9FileName: f?.name || "" });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Signature & Generated PDF File Uploads */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Signature Document</label>
                    <div
                      className="w-full rounded-md border px-3 py-3 text-sm sm:text-base bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) {
                          setSignatureFile(f);
                          setFormData({ ...formData, signatureFileName: f.name });
                        }
                      }}
                      onClick={() => {
                        const el = document.getElementById("onboarding-sig-input") as HTMLInputElement | null;
                        el?.click();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const el = document.getElementById("onboarding-sig-input") as HTMLInputElement | null;
                          el?.click();
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {signatureFile ? signatureFile.name : "Click to choose or drag & drop"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Max 10MB
                          </p>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <input
                        id="onboarding-sig-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setSignatureFile(f);
                          setFormData({ ...formData, signatureFileName: f?.name || "" });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Generated PDF</label>
                    <div
                      className="w-full rounded-md border px-3 py-3 text-sm sm:text-base bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) {
                          setGeneratedPdfFile(f);
                          setFormData({ ...formData, generatedPdfFileName: f.name });
                        }
                      }}
                      onClick={() => {
                        const el = document.getElementById("onboarding-pdf-input") as HTMLInputElement | null;
                        el?.click();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const el = document.getElementById("onboarding-pdf-input") as HTMLInputElement | null;
                          el?.click();
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {generatedPdfFile ? generatedPdfFile.name : "Click to choose or drag & drop"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Max 10MB
                          </p>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <input
                        id="onboarding-pdf-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setGeneratedPdfFile(f);
                          setFormData({ ...formData, generatedPdfFileName: f?.name || "" });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </form>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setStartOnboardingOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartOnboarding}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Start
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* API Error Message */}
        {apiError && (
          <div className="rounded-md bg-destructive/10 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-destructive break-words">
              {apiError}
            </p>
          </div>
        )}

        {/* Summary Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-info" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">In Progress</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Needs Review</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.needsReview}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Onboarding List Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Employees ({onboardingList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading onboarding records...
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 p-4 sm:p-0">
                {onboardingList.map((employee) => (
                  <div
                    key={employee.id}
                    className="p-4 sm:p-5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent sm:border-0"
                  >
                    {/* Mobile View - Stacked Layout */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Avatar and Basic Info */}
                      <div className="flex items-center gap-3 sm:flex-1">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                            {employee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm sm:text-base truncate">{employee.name}</h4>
                            <Badge 
                              className={`${statusClasses[employee.status]} text-xs sm:text-sm w-fit`} 
                              variant="secondary"
                            >
                              {statusLabels[employee.status]}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{employee.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Start: {employee.startDate}
                            </span>
                            <Badge 
                              className={`${approvalClasses[employee.approvalStatus]} text-xs`} 
                              variant="secondary"
                            >
                              {employee.approvalStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* View Details Button - Full width on mobile */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto mt-2 sm:mt-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleViewDetails(employee);
                        }}
                      >
                        View Details
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{employee.progress}%</span>
                      </div>
                      <Progress value={employee.progress} className="h-1.5 sm:h-2" />
                    </div>

                    {/* Steps Badges - Horizontal scroll on mobile if needed */}
                    <div className="mt-3 overflow-x-auto pb-1">
                      <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 min-w-0">
                        {employee.completedSteps.map((step) => (
                          <Badge 
                            key={step} 
                            variant="secondary" 
                            className="bg-success/10 text-success text-xs whitespace-nowrap sm:whitespace-normal"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{step}</span>
                          </Badge>
                        ))}
                        {employee.pendingSteps.map((step) => (
                          <Badge 
                            key={step} 
                            variant="secondary" 
                            className="bg-muted text-muted-foreground text-xs whitespace-nowrap sm:whitespace-normal"
                          >
                            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{step}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {onboardingList.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <div className="flex justify-center mb-3">
                      <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted flex items-center justify-center">
                        <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">No onboarding records found</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Click "Start Onboarding" to add a new employee
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog - Responsive */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Onboarding Details</DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-4 sm:space-y-5">
              {/* Header with Name and Badges */}
              <div className="pb-4 border-b">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-base sm:text-xl font-semibold break-words">{selectedEmployee.name}</p>
                  <Badge className={`${statusClasses[selectedEmployee.status]} text-xs sm:text-sm`} variant="secondary">
                    {statusLabels[selectedEmployee.status]}
                  </Badge>
                  <Badge className={`${approvalClasses[selectedEmployee.approvalStatus]} text-xs sm:text-sm`} variant="secondary">
                    {selectedEmployee.approvalStatus}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedEmployee.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Start Date: {selectedEmployee.startDate}</p>
              </div>

              {/* Documents Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">W-4 (File)</label>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all bg-muted/30 p-2 rounded">
                    {selectedEmployee.w4FileName ? selectedEmployee.w4FileName : "—"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">I-9 (File)</label>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all bg-muted/30 p-2 rounded">
                    {selectedEmployee.i9FileName ? selectedEmployee.i9FileName : "—"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Signature (File)</label>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all bg-muted/30 p-2 rounded">
                    {selectedEmployee.signatureFileName ? selectedEmployee.signatureFileName : "—"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Generated PDF (File)</label>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all bg-muted/30 p-2 rounded">
                    {selectedEmployee.generatedPdfFileName ? selectedEmployee.generatedPdfFileName : "—"}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{selectedEmployee.progress}%</span>
                </div>
                <Progress value={selectedEmployee.progress} className="h-1.5 sm:h-2" />
              </div>

              {/* Completed Steps */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium">Completed Steps</label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {selectedEmployee.completedSteps.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">—</p>
                  ) : (
                    selectedEmployee.completedSteps.map((step) => (
                      <Badge key={step} variant="secondary" className="bg-success/10 text-success text-xs sm:text-sm">
                        <CheckCircle2 className="h-3 w-3 mr-1 flex-shrink-0" />
                        {step}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Pending Steps */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium">Pending Steps</label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {selectedEmployee.pendingSteps.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">—</p>
                  ) : (
                    selectedEmployee.pendingSteps.map((step) => (
                      <Badge key={step} variant="secondary" className="bg-muted text-muted-foreground text-xs sm:text-sm">
                        <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                        {step}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 sm:mt-6">
            {selectedEmployee && (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto order-3 sm:order-1"
                  onClick={() => setApproval(selectedEmployee.id, "rejected")}
                >
                  Reject
                </Button>
                <Button
                  className="w-full sm:w-auto order-2 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => setApproval(selectedEmployee.id, "approved")}
                >
                  Approve
                </Button>
                <Button 
                  className="w-full sm:w-auto order-1 sm:order-3" 
                  onClick={() => setViewDetailsOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Onboarding;