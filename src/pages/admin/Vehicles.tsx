import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
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
  Car,
  Calendar,
  Gauge,
  AlertCircle,
  User,
  AlertTriangle,
  Wrench,
  Clock,
  Camera,
} from "lucide-react";
import { createResource, deleteResource, listResource, updateResource } from "@/lib/admin/apiClient";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  vin: string;
  mileage: string;
  status: "active" | "maintenance" | "inactive";
  lastInspection: string;
  nextInspection: string;
  assignedTo: string;
  tagPhotoFileName?: string;
  tagPhotoDataUrl?: string;
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

// Enhanced status classes with beautiful gradients
const statusClasses = {
  active: "bg-gradient-to-r from-success/20 to-success/10 text-success border-success/20 shadow-sm",
  maintenance: "bg-gradient-to-r from-warning/20 to-warning/10 text-warning border-warning/20 shadow-sm",
  inactive: "bg-gradient-to-r from-muted to-muted/50 text-muted-foreground border-muted-foreground/20 shadow-sm",
};

const pieColors = ["#22c55e", "#f59e0b", "#94a3b8", "#ef4444", "#3b82f6"]; 

const getInitials = (name: string) => {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const toDateOnly = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "";
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
};

type BackendVehicle = Partial<Vehicle> & {
  _id?: string;
  name?: string;
  type?: string;
};

function normalizeVehicle(v: BackendVehicle): Vehicle {
  const id = String(v.id || v._id || "").trim();
  const makeRaw = String(v.make || "").trim();
  const modelRaw = String(v.model || "").trim();
  const yearRaw = String(v.year || "").trim();
  const nameRaw = String(v.name || "").trim();

  // If API returns manager-style `name`, use it as the visible label (store in `make` so UI shows it)
  const make = makeRaw || nameRaw;

  return {
    id,
    make,
    model: modelRaw,
    year: yearRaw,
    licensePlate: String(v.licensePlate || "").trim(),
    vin: String(v.vin || "").trim(),
    mileage: String(v.mileage || "").trim(),
    status: (String(v.status || "active") as Vehicle["status"]) || "active",
    lastInspection: toDateOnly(String(v.lastInspection || "").trim()),
    nextInspection: toDateOnly(String(v.nextInspection || "").trim()),
    assignedTo: String(v.assignedTo || "-").trim() || "-",
    tagPhotoFileName: String(v.tagPhotoFileName || "").trim() || undefined,
    tagPhotoDataUrl: String(v.tagPhotoDataUrl || "").trim() || undefined,
  };
}

function parseISODate(date: string) {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date: string) {
  const d = parseISODate(date);
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

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
} as const;

const itemVariants = {
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

const cardVariants = {
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

const Vehicles = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editVehicleOpen, setEditVehicleOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>(() => []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hoveredVehicle, setHoveredVehicle] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    licensePlate: "",
    vin: "",
    mileage: "",
    status: "active" as Vehicle["status"],
    lastInspection: "",
    nextInspection: "",
    assignedTo: "",
    tagPhotoFileName: "",
    tagPhotoDataUrl: "",
  });

  const [tagPhotoFile, setTagPhotoFile] = useState<File | null>(null);
  const [editTagPhotoFile, setEditTagPhotoFile] = useState<File | null>(null);

  const readFileAsDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const getVehicleTagPhotoSrc = (v?: Partial<Vehicle> | null) => {
    if (!v) return null;
    const dataUrl = String(v.tagPhotoDataUrl || "").trim();
    if (dataUrl) return dataUrl;
    const fileName = String(v.tagPhotoFileName || "").trim();
    if (!fileName) return null;
    if (fileName.startsWith("data:")) return fileName;
    if (fileName.startsWith("http://") || fileName.startsWith("https://")) return fileName;
    if (fileName.startsWith("/")) return fileName;
    return null;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        
        // Fetch vehicles
        const list = await listResource<BackendVehicle>("vehicles");
        if (!mounted) return;
        setVehiclesList(list.map(normalizeVehicle));
        
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
                initials: getInitials(u.name),
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
        setApiError(e instanceof Error ? e.message : "Failed to load vehicles");
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

  const refreshVehicles = async () => {
    const list = await listResource<BackendVehicle>("vehicles");
    setVehiclesList(list.map(normalizeVehicle));
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleAddVehicle = async () => {
    // Validation with user-friendly error messages
    if (!formData.make || !formData.model || !formData.year || !formData.licensePlate) {
      const missingFields = [];
      if (!formData.make) missingFields.push("Make");
      if (!formData.model) missingFields.push("Model");
      if (!formData.year) missingFields.push("Year");
      if (!formData.licensePlate) missingFields.push("License Plate");
      setFormError(`Please fill in the required fields: ${missingFields.join(", ")}`);
      return;
    }
    setFormError(null);
    try {
      setApiError(null);

      let tagPhotoDataUrl = String(formData.tagPhotoDataUrl || "").trim();
      if (!tagPhotoDataUrl && tagPhotoFile) {
        try {
          tagPhotoDataUrl = await readFileAsDataUrl(tagPhotoFile);
        } catch {
          tagPhotoDataUrl = "";
        }
      }

      const newVehicle: Vehicle = {
        id: `VH-${Date.now().toString().slice(-6)}`,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        licensePlate: formData.licensePlate,
        vin: formData.vin,
        mileage: formData.mileage,
        status: formData.status,
        lastInspection: formData.lastInspection,
        nextInspection: formData.nextInspection,
        assignedTo: formData.assignedTo || "-",
        tagPhotoFileName: formData.tagPhotoFileName || "",
        tagPhotoDataUrl,
      };
      await createResource<Vehicle>("vehicles", newVehicle);
      await refreshVehicles();
      setAddVehicleOpen(false);
      setFormError(null);
      setFormData({
        make: "",
        model: "",
        year: "",
        licensePlate: "",
        vin: "",
        mileage: "",
        status: "active",
        lastInspection: "",
        nextInspection: "",
        assignedTo: "",
        tagPhotoFileName: "",
        tagPhotoDataUrl: "",
      });
      setTagPhotoFile(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to add vehicle");
    }
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setViewDetailsOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditTagPhotoFile(null);
    setEditFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      mileage: vehicle.mileage,
      status: vehicle.status,
      lastInspection: vehicle.lastInspection,
      nextInspection: vehicle.nextInspection,
      assignedTo: vehicle.assignedTo,
      tagPhotoFileName: vehicle.tagPhotoFileName || "",
      tagPhotoDataUrl: vehicle.tagPhotoDataUrl || "",
    });
    setEditVehicleOpen(true);
  };

  const [editFormData, setEditFormData] = useState({
    make: "",
    model: "",
    year: "",
    licensePlate: "",
    vin: "",
    mileage: "",
    status: "active" as Vehicle["status"],
    lastInspection: "",
    nextInspection: "",
    assignedTo: "",
    tagPhotoFileName: "",
    tagPhotoDataUrl: "",
  });

  const [editFormError, setEditFormError] = useState<string | null>(null);

  const saveEditVehicle = async () => {
    if (!selectedVehicle) return;
    // Validation with user-friendly error messages
    if (!editFormData.make || !editFormData.model || !editFormData.year || !editFormData.licensePlate) {
      const missingFields = [];
      if (!editFormData.make) missingFields.push("Make");
      if (!editFormData.model) missingFields.push("Model");
      if (!editFormData.year) missingFields.push("Year");
      if (!editFormData.licensePlate) missingFields.push("License Plate");
      setEditFormError(`Please fill in the required fields: ${missingFields.join(", ")}`);
      return;
    }
    setEditFormError(null);
    try {
      setApiError(null);
      let tagPhotoDataUrl = String(editFormData.tagPhotoDataUrl || "").trim();
      if (editTagPhotoFile) {
        try { tagPhotoDataUrl = await readFileAsDataUrl(editTagPhotoFile); } catch { tagPhotoDataUrl = ""; }
      }
      await updateResource<Vehicle>("vehicles", selectedVehicle.id, {
        ...selectedVehicle,
        make: editFormData.make,
        model: editFormData.model,
        year: editFormData.year,
        licensePlate: editFormData.licensePlate,
        vin: editFormData.vin,
        mileage: editFormData.mileage,
        status: editFormData.status,
        lastInspection: editFormData.lastInspection,
        nextInspection: editFormData.nextInspection,
        assignedTo: editFormData.assignedTo || "-",
        tagPhotoFileName: editFormData.tagPhotoFileName || "",
        tagPhotoDataUrl,
      });
      await refreshVehicles();
      setEditVehicleOpen(false);
      setSelectedVehicle(null);
      setEditFormError(null);
      setEditTagPhotoFile(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update vehicle");
    }
  };

  const handleRemoveConfirm = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setRemoveConfirmOpen(true);
  };

  const confirmRemove = async () => {
    if (!selectedVehicle) return;
    try {
      setApiError(null);
      await deleteResource("vehicles", selectedVehicle.id);
      await refreshVehicles();
      setRemoveConfirmOpen(false);
      setSelectedVehicle(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to remove vehicle");
    }
  };

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehiclesList;

    return vehiclesList.filter((v) => {
      const vehicleName = `${v.year} ${v.make} ${v.model}`.toLowerCase();
      return (
        vehicleName.includes(q) ||
        v.licensePlate.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q) ||
        v.assignedTo.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, vehiclesList]);

  const vehiclesStatusData = useMemo(() => {
    const map: Record<string, number> = { active: 0, maintenance: 0, inactive: 0 };
    for (const v of vehiclesList) map[v.status] = (map[v.status] ?? 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [vehiclesList]);

  const inspectionsDueCount = useMemo(() => {
    const DUE_SOON_DAYS = 30;
    return vehiclesList.filter((v) => {
      const d = daysUntil(v.nextInspection);
      if (d === null) return false;
      return d <= DUE_SOON_DAYS;
    }).length;
  }, [vehiclesList]);

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active':
        return <Car className="h-3 w-3" />;
      case 'maintenance':
        return <Wrench className="h-3 w-3" />;
      case 'inactive':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
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
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </motion.div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Vehicle Management
                </h1>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
                Track fleet vehicles, inspections, and maintenance schedules.
              </p>
            </div>

           
            <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white w-full sm:w-auto mt-2 sm:mt-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="sm:hidden">Add</span>
                    <span className="hidden sm:inline">Add Vehicle</span>
                  </Button>
                </motion.div>
              </DialogTrigger>
              
              <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-1.5 sm:space-y-2">
                  <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Add Vehicle
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Create a new vehicle record and add it to your fleet
                  </DialogDescription>
                </DialogHeader>

                <motion.form 
                  className="space-y-4 sm:space-y-5" 
                  onSubmit={(e) => { e.preventDefault(); handleAddVehicle(); }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Form Validation Error */}
                  <AnimatePresence>
                    {formError && (
                      <motion.div
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
                        className="rounded-lg bg-destructive/10 p-3 sm:p-4 border border-destructive/20"
                      >
                        <p className="text-xs sm:text-sm text-destructive flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {formError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Make, Model, Year */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Make *</label>
                      <input
                        type="text"
                        value={formData.make}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Ford"
                        required
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Model *</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="F-150"
                        required
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Year *</label>
                      <input
                        type="text"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="2024"
                        required
                      />
                    </div>
                  </div>

                  {/* License Plate & VIN */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">License Plate *</label>
                      <input
                        type="text"
                        value={formData.licensePlate}
                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="ABC-1234"
                        required
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">VIN</label>
                      <input
                        type="text"
                        value={formData.vin}
                        onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="1FTEW1EP5NFA12345"
                      />
                    </div>
                  </div>

                  {/* Mileage, Assigned To, Status */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Mileage</label>
                      <input
                        type="text"
                        value={formData.mileage}
                        onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="25,430 mi"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Assigned To</label>
                      <select
                        value={formData.assignedTo}
                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
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
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value as Vehicle["status"] })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Inspection Dates */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Last Inspection</label>
                      <input
                        type="date"
                        value={formData.lastInspection}
                        onChange={(e) => setFormData({ ...formData, lastInspection: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Next Inspection</label>
                      <input
                        type="date"
                        value={formData.nextInspection}
                        onChange={(e) => setFormData({ ...formData, nextInspection: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Vehicle Photo Upload */}
                  <div className="flex flex-col gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium mb-1.5">Vehicle Photo</label>
                      <motion.div
                        className="w-full rounded-lg border px-3 py-3 text-sm sm:text-base bg-gradient-to-br from-muted/20 to-muted/5 hover:from-muted/30 hover:to-muted/10 transition-all cursor-pointer"
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const f = e.dataTransfer.files?.[0];
                          if (f) {
                            setTagPhotoFile(f);
                            void readFileAsDataUrl(f).then((url) => setFormData((p) => ({ ...p, tagPhotoFileName: f.name, tagPhotoDataUrl: url })));
                          }
                        }}
                        onClick={() => {
                          const el = document.getElementById("vehicle-photo-input") as HTMLInputElement | null;
                          el?.click();
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            const el = document.getElementById("vehicle-photo-input") as HTMLInputElement | null;
                            el?.click();
                          }
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">
                              {tagPhotoFile ? tagPhotoFile.name : formData.tagPhotoFileName || "Click to choose or drag & drop"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              Max 10MB
                            </p>
                          </div>
                          <Camera className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <input
                          id="vehicle-photo-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setTagPhotoFile(f);
                            if (f) void readFileAsDataUrl(f).then((url) => setFormData((p) => ({ ...p, tagPhotoFileName: f.name, tagPhotoDataUrl: url })));
                          }}
                        />
                      </motion.div>
                    </div>
                    {formData.tagPhotoDataUrl && (
                      <div className="mt-2">
                        <img src={formData.tagPhotoDataUrl} alt="Vehicle preview" className="h-20 w-20 object-contain rounded-lg border" />
                      </div>
                    )}
                  </div>
                </motion.form>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setAddVehicleOpen(false)}
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
                      type="button"
                      onClick={handleAddVehicle}
                      className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                      Add Vehicle
                    </Button>
                  </motion.div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* API Error Message */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="rounded-lg bg-destructive/10 p-3 sm:p-4 border border-destructive/20"
            >
              <p className="text-xs sm:text-sm text-destructive break-words flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {apiError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Cards - Animated Grid */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start"
        >
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm w-full">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
              <CardTitle className="text-base sm:text-lg font-semibold">Vehicles by Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[280px] md:h-[300px] px-2 sm:px-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={vehiclesStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={35}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {vehiclesStatusData.map((_, index) => (
                      <Cell key={index} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <motion.div className="grid grid-cols-2 gap-3 sm:gap-4" variants={containerVariants}>
            {[
              { label: "Total Vehicles", value: vehiclesList.length, icon: Car, color: "primary" },
              { label: "Active", value: vehiclesList.filter((v) => v.status === "active").length, icon: Car, color: "success" },
              { label: "In Maintenance", value: vehiclesList.filter((v) => v.status === "maintenance").length, icon: Wrench, color: "warning" },
              { label: "Inspections Due", value: inspectionsDueCount, icon: Calendar, color: "destructive" },
            ].map((item) => (
              <motion.div
                key={item.label}
                variants={itemVariants}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
              >
                <Card className={`shadow-lg border-0 bg-gradient-to-br from-${item.color}/10 to-${item.color}/5 backdrop-blur-sm overflow-hidden`}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <motion.div
                        className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-${item.color}/10 flex items-center justify-center flex-shrink-0`}
                        whileHover={{ rotate: 10 }}
                        transition={{ type: "spring" as const, stiffness: 300, damping: 10 }}
                      >
                        <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${item.color}`} />
                      </motion.div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.label}</p>
                        <p className="text-xl sm:text-2xl font-bold">{item.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Vehicles Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-muted/20">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Fleet Vehicles
                {filteredVehicles.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                    {filteredVehicles.length} vehicles
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {loading ? (
                <div className="flex justify-center items-center py-8 sm:py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
                  />
                </div>
              ) : (
                <>
                  {/* Mobile View - Cards */}
                  <div className="block sm:hidden space-y-3 p-4">
                    <AnimatePresence>
                      {filteredVehicles.map((vehicle, index) => (
                        <motion.div
                          key={vehicle.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          onHoverStart={() => setHoveredVehicle(vehicle.id)}
                          onHoverEnd={() => setHoveredVehicle(null)}
                          className="bg-gradient-to-br from-card to-card/50 rounded-xl border p-4 space-y-3 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {/* Header with Photo and Actions */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: "spring" as const, stiffness: 300, damping: 10 }}
                              >
                                {(() => {
                                  const photoSrc = getVehicleTagPhotoSrc(vehicle);
                                  return photoSrc ? (
                                    <img src={photoSrc} alt={vehicle.model} className="h-10 w-10 rounded-lg object-cover ring-2 ring-primary/20" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                                      <Car className="h-5 w-5 text-primary" />
                                    </div>
                                  );
                                })()}
                              </motion.div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate flex items-center gap-2">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                  {hoveredVehicle === vehicle.id && (
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="inline-block w-1.5 h-1.5 bg-primary rounded-full"
                                    />
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{vehicle.licensePlate}</p>
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
                                <DropdownMenuItem onClick={() => handleViewDetails(vehicle)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditVehicle(vehicle)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Vehicle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRemoveConfirm(vehicle)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Status Badge */}
                          <div className="flex justify-start">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Badge className={`${statusClasses[vehicle.status]} text-xs flex items-center gap-1`} variant="secondary">
                                {getStatusIcon(vehicle.status)}
                                {vehicle.status}
                              </Badge>
                            </motion.div>
                          </div>

                          {/* License Plate & VIN */}
                          <div className="grid grid-cols-2 gap-2">
                            <motion.div whileHover={{ x: 5 }}>
                              <p className="text-xs text-muted-foreground">License Plate</p>
                              <p className="text-sm font-mono truncate">{vehicle.licensePlate}</p>
                            </motion.div>
                            {vehicle.vin && (
                              <motion.div whileHover={{ x: 5 }}>
                                <p className="text-xs text-muted-foreground">VIN</p>
                                <p className="text-xs truncate">{vehicle.vin.slice(-6)}</p>
                              </motion.div>
                            )}
                          </div>

                          {/* Mileage & Assigned To */}
                          <div className="grid grid-cols-2 gap-2">
                            <motion.div 
                              className="flex items-center gap-1"
                              whileHover={{ x: 5 }}
                            >
                              <Gauge className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">{vehicle.mileage || "—"}</span>
                            </motion.div>
                            <motion.div 
                              className="flex items-center gap-1"
                              whileHover={{ x: 5 }}
                            >
                              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{vehicle.assignedTo}</span>
                            </motion.div>
                          </div>

                          {/* Inspection Info */}
                          <motion.div 
                            className="pt-2 border-t"
                            whileHover={{ x: 5 }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Next Inspection</p>
                                <p className="text-sm">{toDateOnly(vehicle.nextInspection) || "—"}</p>
                              </div>
                              {(() => {
                                const d = daysUntil(vehicle.nextInspection);
                                if (d === null) return null;
                                if (d < 0) {
                                  return (
                                    <Badge variant="secondary" className="bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive text-xs">
                                      Overdue
                                    </Badge>
                                  );
                                }
                                if (d <= 30) {
                                  return (
                                    <Badge variant="secondary" className="bg-gradient-to-r from-warning/20 to-warning/10 text-warning text-xs">
                                      Due in {d}d
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </motion.div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {filteredVehicles.length === 0 && (
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
                            <Car className="h-6 w-6 text-muted-foreground" />
                          </motion.div>
                        </div>
                        <p className="text-sm text-muted-foreground">No vehicles found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try adjusting your search or add a new vehicle
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Tablet/Desktop View - Table */}
                  <div className="hidden sm:block w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs md:text-sm w-[20%]">Vehicle</TableHead>
                          <TableHead className="text-xs md:text-sm w-[12%]">License Plate</TableHead>
                          <TableHead className="text-xs md:text-sm w-[10%]">Mileage</TableHead>
                          <TableHead className="text-xs md:text-sm w-[15%]">Assigned To</TableHead>
                          <TableHead className="text-xs md:text-sm w-[10%]">Status</TableHead>
                          <TableHead className="text-xs md:text-sm w-[15%]">Next Inspection</TableHead>
                          <TableHead className="text-right text-xs md:text-sm w-[10%]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredVehicles.map((vehicle, index) => (
                            <motion.tr
                              key={vehicle.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ 
                                scale: 1.01,
                                backgroundColor: "rgba(59, 130, 246, 0.05)",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                              }}
                              onHoverStart={() => setHoveredVehicle(vehicle.id)}
                              onHoverEnd={() => setHoveredVehicle(null)}
                              className="cursor-pointer transition-all duration-300"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ type: "spring" as const, stiffness: 300, damping: 10 }}
                                  >
                                    {(() => {
                                      const photoSrc = getVehicleTagPhotoSrc(vehicle);
                                      return photoSrc ? (
                                        <img src={photoSrc} alt={vehicle.model} className="h-9 w-9 md:h-10 md:w-10 rounded-lg object-cover ring-2 ring-primary/20" />
                                      ) : (
                                        <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                                          <Car className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                        </div>
                                      );
                                    })()}
                                  </motion.div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm md:text-base truncate max-w-[200px] lg:max-w-[250px] flex items-center gap-2">
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                      {hoveredVehicle === vehicle.id && (
                                        <motion.span
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="inline-block w-1.5 h-1.5 bg-primary rounded-full"
                                        />
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{vehicle.licensePlate}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm md:text-base">
                                {vehicle.licensePlate}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm md:text-base">
                                  <Gauge className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span>{vehicle.mileage || "—"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm md:text-base truncate max-w-[150px]">
                                {vehicle.assignedTo}
                              </TableCell>
                              <TableCell>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Badge className={`${statusClasses[vehicle.status]} text-xs md:text-sm flex items-center gap-1 w-fit`} variant="secondary">
                                    {getStatusIcon(vehicle.status)}
                                    {vehicle.status}
                                  </Badge>
                                </motion.div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm md:text-base">{toDateOnly(vehicle.nextInspection) || "—"}</span>
                                  {(() => {
                                    const d = daysUntil(vehicle.nextInspection);
                                    if (d === null) return null;
                                    if (d < 0) {
                                      return (
                                        <Badge variant="secondary" className="bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive text-xs w-fit">
                                          Overdue
                                        </Badge>
                                      );
                                    }
                                    if (d <= 30) {
                                      return (
                                        <Badge variant="secondary" className="bg-gradient-to-r from-warning/20 to-warning/10 text-warning text-xs w-fit">
                                          Due in {d} days
                                        </Badge>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
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
                                    <DropdownMenuItem onClick={() => handleViewDetails(vehicle)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditVehicle(vehicle)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Vehicle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRemoveConfirm(vehicle)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove
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
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* View Details Dialog - Animated */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Vehicle Details
            </DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <motion.div 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Vehicle Photo Display */}
              {(() => {
                const photoSrc = getVehicleTagPhotoSrc(selectedVehicle);
                return photoSrc ? (
                  <motion.div 
                    className="flex justify-center"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <img 
                      src={photoSrc} 
                      alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                      className="h-32 w-32 object-cover rounded-xl border-2 ring-2 ring-primary/20 shadow-lg"
                    />
                  </motion.div>
                ) : null;
              })()}

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                      <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                  </motion.div>
                  <div>
                    <p className="text-base sm:text-lg font-semibold break-words">
                      {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{selectedVehicle.licensePlate}</p>
                  </div>
                </div>
                <Badge className={`${statusClasses[selectedVehicle.status]} text-xs sm:text-sm self-start sm:self-center flex items-center gap-1`} variant="secondary">
                  {getStatusIcon(selectedVehicle.status)}
                  {selectedVehicle.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">License Plate</label>
                  <p className="text-xs sm:text-sm text-muted-foreground font-mono bg-gradient-to-br from-muted/30 to-muted/10 p-2 rounded-lg">
                    {selectedVehicle.licensePlate}
                  </p>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">VIN</label>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all bg-gradient-to-br from-muted/30 to-muted/10 p-2 rounded-lg">
                    {selectedVehicle.vin || "—"}
                  </p>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Mileage</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedVehicle.mileage || "—"}</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Assigned To</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedVehicle.assignedTo || "—"}</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Last Inspection</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{toDateOnly(selectedVehicle.lastInspection) || "—"}</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-1.5"
                  whileHover={{ x: 5 }}
                >
                  <label className="text-xs sm:text-sm font-medium">Next Inspection</label>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{toDateOnly(selectedVehicle.nextInspection) || "—"}</span>
                    </div>
                    {(() => {
                      const d = daysUntil(selectedVehicle.nextInspection);
                      if (d === null) return null;
                      if (d < 0) {
                        return (
                          <Badge variant="secondary" className="bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive text-xs w-fit">
                            Overdue
                          </Badge>
                        );
                      }
                      if (d <= 30) {
                        return (
                          <Badge variant="secondary" className="bg-gradient-to-r from-warning/20 to-warning/10 text-warning text-xs w-fit">
                            Due in {d} days
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
          <DialogFooter className="mt-4 sm:mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button onClick={() => setViewDetailsOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog - Animated */}
      <Dialog open={editVehicleOpen} onOpenChange={setEditVehicleOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Edit Vehicle
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update vehicle information and save changes
            </DialogDescription>
          </DialogHeader>
          {selectedVehicle && (
            <motion.form 
              className="space-y-4 sm:space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Form Validation Error */}
              <AnimatePresence>
                {editFormError && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="rounded-lg bg-destructive/10 p-3 sm:p-4 border border-destructive/20"
                  >
                    <p className="text-xs sm:text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {editFormError}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Make, Model, Year */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Make *</label>
                  <input
                    type="text"
                    value={editFormData.make}
                    onChange={(e) => setEditFormData({ ...editFormData, make: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Model *</label>
                  <input
                    type="text"
                    value={editFormData.model}
                    onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Year *</label>
                  <input
                    type="text"
                    value={editFormData.year}
                    onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>

              {/* License Plate & VIN */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">License Plate *</label>
                  <input
                    type="text"
                    value={editFormData.licensePlate}
                    onChange={(e) => setEditFormData({ ...editFormData, licensePlate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">VIN</label>
                  <input
                    type="text"
                    value={editFormData.vin}
                    onChange={(e) => setEditFormData({ ...editFormData, vin: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Mileage, Assigned To, Status */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Mileage</label>
                  <input
                    type="text"
                    value={editFormData.mileage}
                    onChange={(e) => setEditFormData({ ...editFormData, mileage: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Assigned To</label>
                  <select
                    value={editFormData.assignedTo}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="">Select assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as Vehicle["status"] })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Inspection Dates */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Last Inspection</label>
                  <input
                    type="date"
                    value={editFormData.lastInspection}
                    onChange={(e) => setEditFormData({ ...editFormData, lastInspection: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Next Inspection</label>
                  <input
                    type="date"
                    value={editFormData.nextInspection}
                    onChange={(e) => setEditFormData({ ...editFormData, nextInspection: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base h-9 sm:h-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Vehicle Photo Upload */}
              <div className="flex flex-col gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Vehicle Photo</label>
                  {(() => {
                    const currentPhoto = editTagPhotoFile 
                      ? URL.createObjectURL(editTagPhotoFile)
                      : getVehicleTagPhotoSrc(selectedVehicle);
                    return currentPhoto ? (
                      <div className="mb-2">
                        <img src={currentPhoto} alt="Current vehicle" className="h-20 w-20 object-cover rounded-lg border" />
                      </div>
                    ) : null;
                  })()}
                  <motion.div
                    className="w-full rounded-lg border px-3 py-3 text-sm sm:text-base bg-gradient-to-br from-muted/20 to-muted/5 hover:from-muted/30 hover:to-muted/10 transition-all cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) {
                        setEditTagPhotoFile(f);
                        void readFileAsDataUrl(f).then((url) => setEditFormData((p) => ({ ...p, tagPhotoFileName: f.name, tagPhotoDataUrl: url })));
                      }
                    }}
                    onClick={() => {
                      const el = document.getElementById("edit-vehicle-photo-input") as HTMLInputElement | null;
                      el?.click();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const el = document.getElementById("edit-vehicle-photo-input") as HTMLInputElement | null;
                        el?.click();
                      }
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {editTagPhotoFile ? editTagPhotoFile.name : editFormData.tagPhotoFileName || "Click to choose or drag & drop"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Max 10MB
                        </p>
                      </div>
                      <Camera className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <input
                      id="edit-vehicle-photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setEditTagPhotoFile(f);
                        if (f) void readFileAsDataUrl(f).then((url) => setEditFormData((p) => ({ ...p, tagPhotoFileName: f.name, tagPhotoDataUrl: url })));
                      }}
                    />
                  </motion.div>
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
                onClick={() => setEditVehicleOpen(false)}
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
                onClick={saveEditVehicle} 
                className="bg-gradient-to-r from-primary to-primary/80 text-white w-full sm:w-auto order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Save Changes
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog - Animated */}
      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg text-destructive">
              Remove Vehicle
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This vehicle will be permanently removed from the fleet list. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVehicle && (
            <motion.div 
              className="rounded-lg bg-gradient-to-br from-destructive/10 to-destructive/5 p-3 sm:p-4 text-xs sm:text-sm mt-2 space-y-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="font-medium break-words">
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              </p>
              <p className="text-muted-foreground break-words">{selectedVehicle.id}</p>
              <p className="text-muted-foreground text-xs">{selectedVehicle.licensePlate}</p>
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
                onClick={() => setRemoveConfirmOpen(false)}
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
                onClick={confirmRemove}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Remove
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add global styles for grid pattern */}
      <style jsx global>{`
        .bg-grid-white {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
        }
      `}</style>
    </AdminLayout>
  );
};

export default Vehicles;
