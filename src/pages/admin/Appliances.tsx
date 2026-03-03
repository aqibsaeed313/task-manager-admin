import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AdminLayout } from "@/components/layout/AdminLayout";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
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
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Wrench,
  Power,
  FileText,
  User,
  Sparkles,
  AlertTriangle,
  Calendar,
  Home,
  Building2,
} from "lucide-react";
import { listResource, apiFetch } from "@/lib/admin/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Appliance {
  id: string;
  name: string;
  type: "residential" | "commercial";
  location: string;
  purchaseDate: string;
  warrantyUntil: string;
  status: "active" | "inactive";
  tagPhotoFileName?: string;
  tagPhotoDataUrl?: string;
  assignedTo?: string;
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

const APPLIANCES_STORAGE_KEY = "appliances";

// Enhanced status classes with beautiful gradients
const statusClasses = {
  active: "bg-gradient-to-r from-success/20 to-success/10 text-success border-success/20 shadow-sm",
  inactive: "bg-gradient-to-r from-muted to-muted/50 text-muted-foreground border-muted-foreground/20 shadow-sm",
};

// Enhanced type classes with beautiful gradients
const typeClasses = {
  residential: "bg-gradient-to-r from-[#22c55e]/20 to-[#10b981]/20 text-[#22c55e] dark:text-[#34d399] border-[#22c55e]/20 shadow-sm",
  commercial: "bg-gradient-to-r from-[#3b82f6]/20 to-[#6366f1]/20 text-[#3b82f6] dark:text-[#818cf8] border-[#3b82f6]/20 shadow-sm",
} as const;

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
    boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)",
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
};

export default function Appliances() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Appliance | null>(null);
  const [hoveredAppliance, setHoveredAppliance] = useState<string | null>(null);

  // Fetch appliances from backend
  const appliancesQuery = useQuery({
    queryKey: ["appliances"],
    queryFn: async () => {
      const res = await apiFetch<{ items?: any[] }>("/api/appliances");
      return res.items || [];
    },
  });

  const appliancesList = useMemo(() => {
    const items = appliancesQuery.data || [];
    return items.map((a: any) => ({
      id: String(a._id || a.id || ""),
      name: String(a.name || ""),
      type: String(a.type || a.category || "commercial") as "residential" | "commercial",
      location: String(a.location || ""),
      purchaseDate: String(a.purchaseDate || a.lastMaintenance || ""),
      warrantyUntil: String(a.warrantyUntil || a.warrantyExpiry || ""),
      status: String(a.status || "active") as "active" | "inactive",
      tagPhotoFileName: a.tagPhotoFileName || "",
      tagPhotoDataUrl: a.tagPhotoDataUrl || a.tagPhotoAttachment?.url || "",
      assignedTo: a.assignedTo || "",
    }));
  }, [appliancesQuery.data]);

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    type: "commercial" as Appliance["type"],
    location: "",
    purchaseDate: "",
    warrantyUntil: "",
    status: "active" as Appliance["status"],
    tagPhotoFileName: "",
    tagPhotoDataUrl: "",
    assignedTo: "",
  });

  const [tagPhotoFile, setTagPhotoFile] = useState<File | null>(null);
  const [editTagPhotoFile, setEditTagPhotoFile] = useState<File | null>(null);

  const [editFormData, setEditFormData] = useState({
    name: "",
    type: "commercial" as Appliance["type"],
    location: "",
    purchaseDate: "",
    warrantyUntil: "",
    status: "active" as Appliance["status"],
    tagPhotoFileName: "",
    tagPhotoDataUrl: "",
    assignedTo: "",
  });

  const readFileAsDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const getApplianceTagPhotoSrc = (a?: Pick<Appliance, "tagPhotoDataUrl" | "tagPhotoFileName"> | null) => {
    if (!a) return null;
    const dataUrl = String(a.tagPhotoDataUrl || "").trim();
    if (dataUrl) return dataUrl;
    const fileName = String(a.tagPhotoFileName || "").trim();
    if (!fileName) return null;
    if (fileName.startsWith("data:")) return fileName;
    if (fileName.startsWith("http://") || fileName.startsWith("https://")) return fileName;
    if (fileName.startsWith("/")) return fileName;
    return null;
  };

  // Mutations for CRUD operations
  const createApplianceMutation = useMutation({
    mutationFn: async (payload: Omit<Appliance, "id">) => {
      const res = await apiFetch<{ item: any }>("/api/appliances", {
        method: "POST",
        body: JSON.stringify({
          name: payload.name,
          category: payload.type,
          serialNumber: payload.location,
          location: payload.location,
          status: payload.status === "active" ? "operational" : "out-of-service",
          warrantyExpiry: payload.warrantyUntil,
          lastMaintenance: payload.purchaseDate,
          assignedTo: payload.assignedTo,
          tagPhotoFileName: payload.tagPhotoFileName,
          tagPhotoDataUrl: payload.tagPhotoDataUrl,
        }),
      });
      return res.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appliances"] });
    },
  });

  const updateApplianceMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Appliance> }) => {
      const res = await apiFetch<{ item: any }>(`/api/appliances/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: payload.name,
          category: payload.type,
          serialNumber: payload.location,
          location: payload.location,
          status: payload.status === "active" ? "operational" : "out-of-service",
          warrantyExpiry: payload.warrantyUntil,
          lastMaintenance: payload.purchaseDate,
          assignedTo: payload.assignedTo,
          tagPhotoFileName: payload.tagPhotoFileName,
          tagPhotoDataUrl: payload.tagPhotoDataUrl,
        }),
      });
      return res.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appliances"] });
    },
  });

  const deleteApplianceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ ok: true }>(`/api/appliances/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appliances"] });
    },
  });

  useEffect(() => {
    let mounted = true;
    const loadEmployees = async () => {
      try {
        let allEmployees: Employee[] = [];
        // Fetch from employees API
        try {
          const employeeList = await listResource<Employee>("employees");
          if (mounted) {
            allEmployees = employeeList.filter((e) => e.status === "active");
          }
        } catch (empErr) {
          console.error("Failed to load employees:", empErr);
        }
        // Fetch users with employee role
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
            // Merge and remove duplicates
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
        console.error("Failed to load employees:", e);
      }
    };
    void loadEmployees();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return appliancesList;
    return appliancesList.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        (a.assignedTo && a.assignedTo.toLowerCase().includes(q))
      );
    });
  }, [appliancesList, searchQuery]);

  const handleAdd = async () => {
    if (!formData.name || !formData.location) return;

    let tagPhotoDataUrl = String(formData.tagPhotoDataUrl || "").trim();
    if (!tagPhotoDataUrl && tagPhotoFile) {
      try {
        tagPhotoDataUrl = await readFileAsDataUrl(tagPhotoFile);
      } catch {
        tagPhotoDataUrl = "";
      }
    }

    const payload: Omit<Appliance, "id"> = {
      name: formData.name,
      type: formData.type,
      location: formData.location,
      purchaseDate: formData.purchaseDate,
      warrantyUntil: formData.warrantyUntil,
      status: formData.status,
      tagPhotoFileName: formData.tagPhotoFileName || "",
      tagPhotoDataUrl,
      assignedTo: formData.assignedTo || "",
    };

    await createApplianceMutation.mutateAsync(payload);
    setAddOpen(false);
    setFormData({
      name: "",
      type: "commercial",
      location: "",
      purchaseDate: "",
      warrantyUntil: "",
      status: "active",
      tagPhotoFileName: "",
      tagPhotoDataUrl: "",
      assignedTo: "",
    });
    setTagPhotoFile(null);
  };

  const onView = (a: Appliance) => {
    setSelected(a);
    setViewOpen(true);
  };

  const onEdit = (a: Appliance) => {
    setSelected(a);
    setEditTagPhotoFile(null);
    setEditFormData({
      name: a.name,
      type: a.type,
      location: a.location,
      purchaseDate: a.purchaseDate,
      warrantyUntil: a.warrantyUntil,
      status: a.status,
      tagPhotoFileName: a.tagPhotoFileName || "",
      tagPhotoDataUrl: a.tagPhotoDataUrl || "",
      assignedTo: a.assignedTo || "",
    });
    setEditOpen(true);
  };

  const onSaveEdit = async () => {
    if (!selected) return;
    if (!editFormData.name || !editFormData.location) return;
    await updateApplianceMutation.mutateAsync({
      id: selected.id,
      payload: {
        name: editFormData.name,
        type: editFormData.type,
        location: editFormData.location,
        purchaseDate: editFormData.purchaseDate,
        warrantyUntil: editFormData.warrantyUntil,
        status: editFormData.status,
        tagPhotoFileName: editFormData.tagPhotoFileName,
        tagPhotoDataUrl: editFormData.tagPhotoDataUrl,
        assignedTo: editFormData.assignedTo,
      },
    });
    setEditOpen(false);
    setSelected(null);
  };

  const onDeactivate = (a: Appliance) => {
    setSelected(a);
    setDeactivateOpen(true);
  };

  const confirmToggle = async () => {
    if (!selected) return;
    const newStatus = selected.status === "inactive" ? "active" : "inactive";
    await updateApplianceMutation.mutateAsync({
      id: selected.id,
      payload: { status: newStatus },
    });
    setDeactivateOpen(false);
    setSelected(null);
  };

  const onDelete = (a: Appliance) => {
    setSelected(a);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    await deleteApplianceMutation.mutateAsync(selected.id);
    setDeleteOpen(false);
    setSelected(null);
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'commercial':
        return <Building2 className="h-4 w-4" />;
      case 'residential':
        return <Home className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout>
      <motion.div 
        className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0 pb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header with animated gradient */}
        <motion.div 
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </motion.div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Appliances Management
                </h1>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
                Track appliances, warranties, and assignments by location.
              </p>
            </div>

            {/* Add Button Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white w-full sm:w-auto mt-2 sm:mt-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="sm:hidden">Add</span>
                    <span className="hidden sm:inline">Add Appliance</span>
                  </Button>
                </motion.div>
              </DialogTrigger>
              
              {/* Add Dialog - Responsive */}
              <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6">
                <DialogHeader className="space-y-1.5 sm:space-y-2">
                  <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Add Appliance
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Create a new appliance record
                  </DialogDescription>
                </DialogHeader>
                
                <motion.form 
                  className="space-y-4 sm:space-y-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Name & Location - Stack on mobile, row on tablet+ */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Name *</label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="HVAC Unit - Floor 2"
                        required
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Location *</label>
                      <input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Building A - Corporate Office"
                        required
                      />
                    </div>
                  </div>

                  {/* Assigned To */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Assigned To</label>
                      <select
                        value={formData.assignedTo}
                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="">Select assignee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
                      {employees.length === 0 && (
                        <p className="text-xs text-warning mt-1">No employees found.</p>
                      )}
                    </div>
                  </div>

                  {/* Tag Photo File Upload */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">
                      Tag Photo
                    </label>
                    <motion.div
                      className="w-full rounded-lg border px-3 py-3 text-sm sm:text-base bg-gradient-to-br from-muted/20 to-muted/5 hover:from-muted/30 hover:to-muted/10 transition-all cursor-pointer"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) {
                          setTagPhotoFile(f);
                          void readFileAsDataUrl(f)
                            .then((dataUrl) => {
                              setFormData((prev) => ({ ...prev, tagPhotoFileName: f.name, tagPhotoDataUrl: dataUrl }));
                            })
                            .catch(() => {
                              setFormData((prev) => ({ ...prev, tagPhotoFileName: f.name, tagPhotoDataUrl: "" }));
                            });
                        }
                      }}
                      onClick={() => {
                        const el = document.getElementById("appliance-tag-input") as HTMLInputElement | null;
                        el?.click();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const el = document.getElementById("appliance-tag-input") as HTMLInputElement | null;
                          el?.click();
                        }
                      }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {tagPhotoFile ? tagPhotoFile.name : "Click to choose or drag & drop a file"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Max 10MB
                          </p>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <input
                        id="appliance-tag-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setTagPhotoFile(f);
                          if (!f) {
                            setFormData((prev) => ({ ...prev, tagPhotoFileName: "", tagPhotoDataUrl: "" }));
                            return;
                          }
                          void readFileAsDataUrl(f)
                            .then((dataUrl) => {
                              setFormData((prev) => ({ ...prev, tagPhotoFileName: f.name, tagPhotoDataUrl: dataUrl }));
                            })
                            .catch(() => {
                              setFormData((prev) => ({ ...prev, tagPhotoFileName: f.name, tagPhotoDataUrl: "" }));
                            });
                        }}
                      />
                    </motion.div>
                  </div>

                  {/* Type, Purchase, Warranty - Stack on mobile, grid on tablet+ */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value as Appliance["type"] })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="commercial">Commercial</option>
                        <option value="residential">Residential</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Purchase Date</label>
                      <input
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Warranty Until</label>
                      <input
                        type="date"
                        value={formData.warrantyUntil}
                        onChange={(e) => setFormData({ ...formData, warrantyUntil: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="w-full sm:w-1/2">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value as Appliance["status"] })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </motion.form>
                
                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button 
                      variant="outline" 
                      onClick={() => setAddOpen(false)}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button 
                      onClick={handleAdd} 
                      className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                      Add Appliance
                    </Button>
                  </motion.div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Appliance Summary Cards - Animated */}
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
          variants={containerVariants}
        >
          {[
            { label: "Total Appliances", value: appliancesList.length, icon: Wrench, color: "primary" },
            { label: "Commercial", value: appliancesList.filter(a => a.type === "commercial").length, icon: Building2, color: "[#3b82f6]" },
            { label: "Residential", value: appliancesList.filter(a => a.type === "residential").length, icon: Home, color: "[#22c55e]" },
            { label: "Active", value: appliancesList.filter(a => a.status === "active").length, icon: Power, color: "success" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              variants={itemVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
            >
              <Card className={`shadow-lg border-0 bg-gradient-to-br from-${item.color}/10 to-${item.color}/5 backdrop-blur-sm overflow-hidden`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <motion.div 
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-${item.color}/10 flex items-center justify-center flex-shrink-0`}
                      whileHover={{ rotate: 10 }}
                      transition={{ type: "spring" as const, stiffness: 300, damping: 10 }}
                    >
                      <item.icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${item.color}`} />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.label}</p>
                      <p className="text-lg sm:text-xl font-bold">{item.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Search Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, location, or assignee..."
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base rounded-lg border-0 bg-muted/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appliances Table Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-muted/20">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Appliances
                {filtered.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                    {filtered.length} total
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* Mobile View - Cards */}
              <div className="block sm:hidden space-y-3 p-4">
                <AnimatePresence>
                  {filtered.map((a, index) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      onHoverStart={() => setHoveredAppliance(a.id)}
                      onHoverEnd={() => setHoveredAppliance(null)}
                      className="bg-gradient-to-br from-card to-card/50 rounded-xl border p-4 space-y-3 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {/* Header with Icon and Name */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring" as const, stiffness: 300, damping: 10 }}
                          >
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                              {getApplianceTagPhotoSrc(a) ? (
                                <img
                                  src={getApplianceTagPhotoSrc(a) || ""}
                                  alt={a.name}
                                  className="h-full w-full rounded-lg object-contain bg-white/60"
                                />
                              ) : (
                                <Wrench className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate flex items-center gap-2">
                              {a.name}
                              {hoveredAppliance === a.id && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="inline-block w-1.5 h-1.5 bg-primary rounded-full"
                                />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{a.id}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(a)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(a)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeactivate(a)}
                              className="text-destructive"
                            >
                              <Power className="mr-2 h-4 w-4" />
                              {a.status === "inactive" ? "Activate" : "Deactivate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDelete(a)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <motion.div whileHover={{ x: 5 }}>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <Badge className={`${typeClasses[a.type]} mt-1 flex items-center gap-1 w-fit`} variant="secondary">
                            {getTypeIcon(a.type)}
                            {a.type}
                          </Badge>
                        </motion.div>
                        <motion.div whileHover={{ x: 5 }}>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge className={`${statusClasses[a.status]} mt-1 flex items-center gap-1 w-fit`} variant="secondary">
                            {a.status === "active" ? <Power className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {a.status}
                          </Badge>
                        </motion.div>
                        <motion.div className="col-span-2" whileHover={{ x: 5 }}>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="text-sm mt-1 truncate">{a.location}</p>
                        </motion.div>
                        {a.assignedTo && (
                          <motion.div className="col-span-2" whileHover={{ x: 5 }}>
                            <p className="text-xs text-muted-foreground">Assigned To</p>
                            <div className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm">{a.assignedTo}</p>
                            </div>
                          </motion.div>
                        )}
                        <motion.div whileHover={{ x: 5 }}>
                          <p className="text-xs text-muted-foreground">Warranty</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm">{a.warrantyUntil || "—"}</p>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filtered.length === 0 && (
                  <motion.div 
                    className="text-center py-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="flex justify-center mb-3">
                      <motion.div 
                        className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Wrench className="h-6 w-6 text-muted-foreground" />
                      </motion.div>
                    </div>
                    <p className="text-sm text-muted-foreground">No appliances found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search or add a new appliance
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Tablet/Desktop View - Table */}
              <div className="hidden sm:block w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs md:text-sm">Appliance</TableHead>
                      <TableHead className="text-xs md:text-sm">Type</TableHead>
                      <TableHead className="text-xs md:text-sm">Location</TableHead>
                      <TableHead className="text-xs md:text-sm">Assigned To</TableHead>
                      <TableHead className="text-xs md:text-sm">Warranty</TableHead>
                      <TableHead className="text-xs md:text-sm">Status</TableHead>
                      <TableHead className="text-right text-xs md:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filtered.map((a, index) => (
                        <motion.tr
                          key={a.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ 
                            scale: 1.01,
                            backgroundColor: "rgba(59, 130, 246, 0.05)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                          }}
                          onHoverStart={() => setHoveredAppliance(a.id)}
                          onHoverEnd={() => setHoveredAppliance(null)}
                          className="cursor-pointer transition-all duration-300"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: "spring" as const, stiffness: 300, damping: 10 }}
                              >
                                <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                                  {getApplianceTagPhotoSrc(a) ? (
                                    <img
                                      src={getApplianceTagPhotoSrc(a) || ""}
                                      alt={a.name}
                                      className="h-full w-full rounded-lg object-contain bg-white/60"
                                    />
                                  ) : (
                                    <Wrench className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                  )}
                                </div>
                              </motion.div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm md:text-base truncate max-w-[200px] lg:max-w-[250px] flex items-center gap-2">
                                  {a.name}
                                  {hoveredAppliance === a.id && (
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="inline-block w-1.5 h-1.5 bg-primary rounded-full"
                                    />
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{a.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Badge className={`${typeClasses[a.type]} text-xs md:text-sm flex items-center gap-1 w-fit`} variant="secondary">
                                {getTypeIcon(a.type)}
                                {a.type}
                              </Badge>
                            </motion.div>
                          </TableCell>
                          <TableCell className="max-w-[150px] lg:max-w-[200px]">
                            <p className="text-sm md:text-base truncate">{a.location}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm md:text-base truncate max-w-[100px]">
                                {a.assignedTo || "—"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm md:text-base">{a.warrantyUntil || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Badge className={`${statusClasses[a.status]} text-xs md:text-sm flex items-center gap-1 w-fit`} variant="secondary">
                                {a.status === "active" ? <Power className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                {a.status}
                              </Badge>
                            </motion.div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onView(a)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(a)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeactivate(a)}
                                  className="text-destructive"
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  {a.status === "inactive" ? "Activate" : "Deactivate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDelete(a)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* View Details Dialog - Animated */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Appliance Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <motion.div 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="border-b pb-3 sm:pb-4">
                <p className="text-xs sm:text-sm text-muted-foreground">{selected.id}</p>
                <p className="text-lg sm:text-xl font-semibold break-words">{selected.name}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Type</label>
                  <div>
                    <Badge className={`${typeClasses[selected.type]} text-xs sm:text-sm flex items-center gap-1 w-fit`} variant="secondary">
                      {getTypeIcon(selected.type)}
                      {selected.type}
                    </Badge>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Status</label>
                  <div>
                    <Badge className={`${statusClasses[selected.status]} text-xs sm:text-sm flex items-center gap-1 w-fit`} variant="secondary">
                      {selected.status === "active" ? <Power className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {selected.status}
                    </Badge>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="sm:col-span-2 space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Location</label>
                  <p className="text-sm sm:text-base text-muted-foreground break-words bg-gradient-to-br from-muted/30 to-muted/10 p-2 rounded-lg">
                    {selected.location}
                  </p>
                </motion.div>

                {selected.assignedTo && (
                  <motion.div 
                    className="sm:col-span-2 space-y-1.5"
                    whileHover={{ x: 5 }}
                  >
                    <label className="text-xs sm:text-sm font-medium">Assigned To</label>
                    <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/10 p-2 rounded-lg">
                      <User className="h-4 w-4" />
                      <span>{selected.assignedTo}</span>
                    </div>
                  </motion.div>
                )}
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Purchase Date</label>
                  <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{selected.purchaseDate || "—"}</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Warranty Until</label>
                  <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{selected.warrantyUntil || "—"}</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="sm:col-span-2 space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Tag Photo</label>
                  {getApplianceTagPhotoSrc(selected) ? (
                    <div className="space-y-2">
                      <div className="w-full overflow-hidden rounded-xl border bg-muted/10">
                        <img
                          src={getApplianceTagPhotoSrc(selected) || ""}
                          alt={selected.name}
                          className="w-full h-44 sm:h-64 object-contain bg-white"
                        />
                      </div>
                      {selected.tagPhotoFileName && (
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                          {selected.tagPhotoFileName}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/10 p-2 rounded-lg break-words">
                      {selected.tagPhotoFileName ? selected.tagPhotoFileName : "—"}
                    </p>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
          <DialogFooter className="mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button onClick={() => setViewOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Animated */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Edit Appliance
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update appliance information and save changes
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <motion.form 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Name & Location */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Name *</label>
                  <input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Location *</label>
                  <input
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Tag Photo */}
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-medium">
                  Tag Photo
                </label>
                {getApplianceTagPhotoSrc(editFormData) && (
                  <div className="w-full overflow-hidden rounded-xl border bg-muted/10">
                    <img
                      src={getApplianceTagPhotoSrc(editFormData) || ""}
                      alt={editFormData.name || "Tag photo"}
                      className="w-full h-44 sm:h-64 object-contain bg-white"
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <motion.div
                    className="w-full rounded-lg border px-3 py-3 text-sm sm:text-base bg-gradient-to-br from-muted/20 to-muted/5 hover:from-muted/30 hover:to-muted/10 transition-all cursor-pointer"
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) {
                        setEditTagPhotoFile(f);
                        void readFileAsDataUrl(f)
                          .then((dataUrl) => {
                            setEditFormData((prev) => ({
                              ...prev,
                              tagPhotoFileName: f.name,
                              tagPhotoDataUrl: dataUrl,
                            }));
                          })
                          .catch(() => {
                            setEditFormData((prev) => ({
                              ...prev,
                              tagPhotoFileName: f.name,
                              tagPhotoDataUrl: "",
                            }));
                          });
                      }
                    }}
                    onClick={() => {
                      const el = document.getElementById("appliance-edit-tag-input") as HTMLInputElement | null;
                      el?.click();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const el = document.getElementById("appliance-edit-tag-input") as HTMLInputElement | null;
                        el?.click();
                      }
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {editTagPhotoFile
                            ? editTagPhotoFile.name
                            : editFormData.tagPhotoFileName
                              ? editFormData.tagPhotoFileName
                              : "Click to choose or drag & drop a file"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Max 10MB
                        </p>
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <input
                      id="appliance-edit-tag-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setEditTagPhotoFile(f);
                        if (!f) {
                          return;
                        }
                        void readFileAsDataUrl(f)
                          .then((dataUrl) => {
                            setEditFormData((prev) => ({
                              ...prev,
                              tagPhotoFileName: f.name,
                              tagPhotoDataUrl: dataUrl,
                            }));
                          })
                          .catch(() => {
                            setEditFormData((prev) => ({
                              ...prev,
                              tagPhotoFileName: f.name,
                              tagPhotoDataUrl: "",
                            }));
                          });
                      }}
                    />
                  </motion.div>

                  {(editFormData.tagPhotoFileName || editFormData.tagPhotoDataUrl) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setEditTagPhotoFile(null);
                        setEditFormData((prev) => ({
                          ...prev,
                          tagPhotoFileName: "",
                          tagPhotoDataUrl: "",
                        }));
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {/* Assigned To */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Assigned To</label>
                  <select
                    value={editFormData.assignedTo}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="">Select assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type, Purchase, Warranty */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Type</label>
                  <select
                    value={editFormData.type}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, type: e.target.value as Appliance["type"] })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="commercial">Commercial</option>
                    <option value="residential">Residential</option>
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    value={editFormData.purchaseDate}
                    onChange={(e) => setEditFormData({ ...editFormData, purchaseDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Warranty Until</label>
                  <input
                    type="date"
                    value={editFormData.warrantyUntil}
                    onChange={(e) => setEditFormData({ ...editFormData, warrantyUntil: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as Appliance["status"] })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </motion.form>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="outline" 
                onClick={() => setEditOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                onClick={onSaveEdit} 
                className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Save Changes
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Dialog - Animated */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className={`text-base sm:text-lg ${selected?.status === "inactive" ? "text-primary" : "text-destructive"}`}>
              {selected?.status === "inactive" ? "Activate Appliance" : "Deactivate Appliance"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selected?.status === "inactive"
                ? "This appliance will be marked as active again."
                : "This appliance will be marked as inactive."}
            </DialogDescription>
          </DialogHeader>
          
          {selected && (
            <motion.div 
              className="rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-3 sm:p-4 text-xs sm:text-sm mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="font-medium break-words">{selected.name}</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words">{selected.id}</p>
            </motion.div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="outline" 
                onClick={() => setDeactivateOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant={selected?.status === "inactive" ? "default" : "destructive"}
                onClick={confirmToggle}
                className={`w-full sm:w-auto order-1 sm:order-2 ${
                  selected?.status === "inactive" 
                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg hover:shadow-xl" 
                    : ""
                }`}
              >
                {selected?.status === "inactive" ? "Activate" : "Deactivate"}
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog - Animated */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">
              Delete Appliance
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This action cannot be undone. The appliance will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          
          {selected && (
            <motion.div 
              className="rounded-lg bg-gradient-to-br from-destructive/10 to-destructive/5 p-3 sm:p-4 text-xs sm:text-sm mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="font-medium break-words">{selected.name}</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words">{selected.id}</p>
            </motion.div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="outline" 
                onClick={() => setDeleteOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Delete
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add global styles for grid pattern */}
      <style>{`
        .bg-grid-white {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
        }
      `}</style>
    </AdminLayout>
  );
}