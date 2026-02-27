import { useEffect, useMemo, useState } from "react";
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
  Car,
  Calendar,
  Shield,
  FileText,
  Gauge,
  AlertCircle,
  User,
  Hash,
  FileSignature,
} from "lucide-react";
import { createResource, deleteResource, listResource, updateResource, apiFetch } from "@/lib/admin/apiClient";

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
  registrationFileName?: string;
  insuranceFileName?: string;
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

const statusClasses = {
  active: "bg-success/10 text-success",
  maintenance: "bg-warning/10 text-warning",
  inactive: "bg-muted text-muted-foreground",
};

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
    registrationFileName: "",
    insuranceFileName: "",
  });

  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

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
    registrationFileName: "",
    insuranceFileName: "",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        
        // Fetch vehicles
        const list = await listResource<Vehicle>("vehicles");
        if (!mounted) return;
        setVehiclesList(list);
        
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
    const list = await listResource<Vehicle>("vehicles");
    setVehiclesList(list);
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
        registrationFileName: formData.registrationFileName || "",
        insuranceFileName: formData.insuranceFileName || "",
      };
      if (registrationFile || insuranceFile) {
        const fd = new FormData();
        fd.append("make", formData.make);
        fd.append("model", formData.model);
        fd.append("year", formData.year);
        fd.append("licensePlate", formData.licensePlate);
        fd.append("vin", formData.vin);
        fd.append("mileage", formData.mileage);
        fd.append("status", formData.status);
        fd.append("lastInspection", formData.lastInspection);
        fd.append("nextInspection", formData.nextInspection);
        fd.append("assignedTo", formData.assignedTo || "-");
        if (registrationFile) fd.append("registrationFile", registrationFile);
        if (insuranceFile) fd.append("insuranceFile", insuranceFile);

        await apiFetch<{ item: Vehicle }>("/api/vehicles/upload", {
          method: "POST",
          body: fd,
        });
      } else {
        await createResource<Vehicle>("vehicles", newVehicle);
      }
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
        registrationFileName: "",
        insuranceFileName: "",
      });
      setRegistrationFile(null);
      setInsuranceFile(null);
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
      registrationFileName: vehicle.registrationFileName || "",
      insuranceFileName: vehicle.insuranceFileName || "",
    });
    setEditVehicleOpen(true);
  };

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
        registrationFileName: editFormData.registrationFileName || "",
        insuranceFileName: editFormData.insuranceFileName || "",
      });
      await refreshVehicles();
      setEditVehicleOpen(false);
      setSelectedVehicle(null);
      setEditFormError(null);
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
        v.assignedTo.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, vehiclesList]);

  const inspectionsDueCount = useMemo(() => {
    const DUE_SOON_DAYS = 30;
    return vehiclesList.filter((v) => {
      const d = daysUntil(v.nextInspection);
      if (d === null) return false;
      return d <= DUE_SOON_DAYS;
    }).length;
  }, [vehiclesList]);

  return (
    <AdminLayout>
      {/* Mobile-first container */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        
        {/* Page Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Vehicle Management
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
              Track fleet vehicles, inspections, and maintenance schedules.
            </p>
          </div>

          {/* Add Vehicle Dialog */}
          <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add Vehicle</span>
              </Button>
            </DialogTrigger>
            
            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-1.5 sm:space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Add Vehicle</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new vehicle record and add it to your fleet
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4 sm:space-y-5" onSubmit={(e) => { e.preventDefault(); handleAddVehicle(); }}>
                {/* Form Validation Error */}
                {formError && (
                  <div className="rounded-md bg-destructive/10 p-3 sm:p-4 border border-destructive/20">
                    <p className="text-xs sm:text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {formError}
                    </p>
                  </div>
                )}

                {/* Make, Model, Year */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Make *</label>
                    <input
                      type="text"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                      placeholder="25,430 mi"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Assigned To</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
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
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Next Inspection</label>
                    <input
                      type="date"
                      value={formData.nextInspection}
                      onChange={(e) => setFormData({ ...formData, nextInspection: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                    />
                  </div>
                </div>

                {/* Document File Uploads */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Registration Document</label>
                    <div
                      className="w-full rounded-md border px-3 py-3 text-sm sm:text-base bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) {
                          setRegistrationFile(f);
                          setFormData({ ...formData, registrationFileName: f.name });
                        }
                      }}
                      onClick={() => {
                        const el = document.getElementById("vehicle-reg-input") as HTMLInputElement | null;
                        el?.click();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const el = document.getElementById("vehicle-reg-input") as HTMLInputElement | null;
                          el?.click();
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {registrationFile ? registrationFile.name : "Click to choose or drag & drop"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Max 10MB
                          </p>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <input
                        id="vehicle-reg-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setRegistrationFile(f);
                          setFormData({ ...formData, registrationFileName: f?.name || "" });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">Insurance Document</label>
                    <div
                      className="w-full rounded-md border px-3 py-3 text-sm sm:text-base bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) {
                          setInsuranceFile(f);
                          setFormData({ ...formData, insuranceFileName: f.name });
                        }
                      }}
                      onClick={() => {
                        const el = document.getElementById("vehicle-ins-input") as HTMLInputElement | null;
                        el?.click();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const el = document.getElementById("vehicle-ins-input") as HTMLInputElement | null;
                          el?.click();
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {insuranceFile ? insuranceFile.name : "Click to choose or drag & drop"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Max 10MB
                          </p>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <input
                        id="vehicle-ins-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setInsuranceFile(f);
                          setFormData({ ...formData, insuranceFileName: f?.name || "" });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </form>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setAddVehicleOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={handleAddVehicle}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Add Vehicle
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
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Vehicles</p>
                  <p className="text-xl sm:text-2xl font-bold">{vehiclesList.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Active</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {vehiclesList.filter((v) => v.status === "active").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">In Maintenance</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {vehiclesList.filter((v) => v.status === "maintenance").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-0 sm:border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Inspections Due</p>
                  <p className="text-xl sm:text-2xl font-bold">{inspectionsDueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardContent className="p-3 sm:p-6">
            <div className="relative w-full sm:max-w-md">
              <label className="block text-xs text-muted-foreground mb-1.5 sm:hidden">
                Search Vehicles
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by make, model, plate, or assignee..."
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Card */}
        <Card className="shadow-soft border-0 sm:border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Fleet Vehicles ({filteredVehicles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Loading vehicles...
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="block sm:hidden space-y-3 p-4">
                  {filteredVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="bg-white rounded-lg border p-4 space-y-3">
                      {/* Header with Icon and Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Car className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-xs text-muted-foreground">{vehicle.id}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
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
                        <Badge className={`${statusClasses[vehicle.status]} text-xs`} variant="secondary">
                          {vehicle.status}
                        </Badge>
                      </div>

                      {/* License Plate & VIN */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">License Plate</p>
                          <p className="text-sm font-mono truncate">{vehicle.licensePlate}</p>
                        </div>
                        {vehicle.vin && (
                          <div>
                            <p className="text-xs text-muted-foreground">VIN</p>
                            <p className="text-xs truncate">{vehicle.vin.slice(-6)}</p>
                          </div>
                        )}
                      </div>

                      {/* Mileage & Assigned To */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <Gauge className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{vehicle.mileage || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{vehicle.assignedTo}</span>
                        </div>
                      </div>

                      {/* Inspection Info */}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Next Inspection</p>
                            <p className="text-sm">{vehicle.nextInspection || "—"}</p>
                          </div>
                          {(() => {
                            const d = daysUntil(vehicle.nextInspection);
                            if (d === null) return null;
                            if (d < 0) {
                              return (
                                <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                                  Overdue
                                </Badge>
                              );
                            }
                            if (d <= 30) {
                              return (
                                <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                                  Due in {d}d
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredVehicles.length === 0 && (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <Car className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">No vehicles found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search or add a new vehicle
                      </p>
                    </div>
                  )}
                </div>

                {/* Tablet/Desktop View - Table */}
                <div className="hidden sm:block w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {filteredVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <Car className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm md:text-base truncate max-w-[200px] lg:max-w-[250px]">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </p>
                                <p className="text-xs text-muted-foreground">{vehicle.id}</p>
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
                            <Badge className={`${statusClasses[vehicle.status]} text-xs md:text-sm`} variant="secondary">
                              {vehicle.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm md:text-base">{vehicle.nextInspection || "—"}</span>
                              {(() => {
                                const d = daysUntil(vehicle.nextInspection);
                                if (d === null) return null;
                                if (d < 0) {
                                  return (
                                    <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs w-fit">
                                      Overdue
                                    </Badge>
                                  );
                                }
                                if (d <= 30) {
                                  return (
                                    <Badge variant="secondary" className="bg-warning/10 text-warning text-xs w-fit">
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
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog - Responsive */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Vehicle Details</DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Car className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-semibold break-words">
                      {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{selectedVehicle.id}</p>
                  </div>
                </div>
                <Badge className={`${statusClasses[selectedVehicle.status]} text-xs sm:text-sm self-start sm:self-center`} variant="secondary">
                  {selectedVehicle.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">License Plate</label>
                  <p className="text-xs sm:text-sm text-muted-foreground font-mono bg-muted/30 p-2 rounded">
                    {selectedVehicle.licensePlate}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">VIN</label>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all bg-muted/30 p-2 rounded">
                    {selectedVehicle.vin || "—"}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Mileage</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedVehicle.mileage || "—"}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Assigned To</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedVehicle.assignedTo || "—"}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Last Inspection</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedVehicle.lastInspection || "—"}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Next Inspection</label>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{selectedVehicle.nextInspection || "—"}</span>
                    </div>
                    {(() => {
                      const d = daysUntil(selectedVehicle.nextInspection);
                      if (d === null) return null;
                      if (d < 0) {
                        return (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs w-fit">
                            Overdue
                          </Badge>
                        );
                      }
                      if (d <= 30) {
                        return (
                          <Badge variant="secondary" className="bg-warning/10 text-warning text-xs w-fit">
                            Due in {d} days
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Registration (File)</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/30 p-2 rounded break-all">
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedVehicle.registrationFileName ? selectedVehicle.registrationFileName : "—"}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium">Insurance (File)</label>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/30 p-2 rounded break-all">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{selectedVehicle.insuranceFileName ? selectedVehicle.insuranceFileName : "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 sm:mt-6">
            <Button onClick={() => setViewDetailsOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog - Responsive */}
      <Dialog open={editVehicleOpen} onOpenChange={setEditVehicleOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Edit Vehicle</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update vehicle information and save changes
            </DialogDescription>
          </DialogHeader>
          {selectedVehicle && (
            <form className="space-y-4 sm:space-y-5">
              {/* Form Validation Error */}
              {editFormError && (
                <div className="rounded-md bg-destructive/10 p-3 sm:p-4 border border-destructive/20">
                  <p className="text-xs sm:text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {editFormError}
                  </p>
                </div>
              )}

              {/* Make, Model, Year */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Make *</label>
                  <input
                    type="text"
                    value={editFormData.make}
                    onChange={(e) => setEditFormData({ ...editFormData, make: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Model *</label>
                  <input
                    type="text"
                    value={editFormData.model}
                    onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Year *</label>
                  <input
                    type="text"
                    value={editFormData.year}
                    onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
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
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                    required
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">VIN</label>
                  <input
                    type="text"
                    value={editFormData.vin}
                    onChange={(e) => setEditFormData({ ...editFormData, vin: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
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
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Assigned To</label>
                  <select
                    value={editFormData.assignedTo}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
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
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base bg-white h-9 sm:h-10"
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
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Next Inspection</label>
                  <input
                    type="date"
                    value={editFormData.nextInspection}
                    onChange={(e) => setEditFormData({ ...editFormData, nextInspection: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                  />
                </div>
              </div>

              {/* Document File Names */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Registration (File Name)</label>
                  <input
                    type="text"
                    value={editFormData.registrationFileName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, registrationFileName: e.target.value })
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                    placeholder="e.g., registration.pdf"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5">Insurance (File Name)</label>
                  <input
                    type="text"
                    value={editFormData.insuranceFileName}
                    onChange={(e) => setEditFormData({ ...editFormData, insuranceFileName: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm sm:text-base h-9 sm:h-10"
                  />
                </div>
              </div>
            </form>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setEditVehicleOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveEditVehicle} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto order-1 sm:order-2"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog - Responsive */}
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
            <div className="rounded-md bg-muted p-3 sm:p-4 text-xs sm:text-sm mt-2 space-y-1">
              <p className="font-medium break-words">
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              </p>
              <p className="text-muted-foreground break-words">{selectedVehicle.id}</p>
              <p className="text-muted-foreground text-xs">{selectedVehicle.licensePlate}</p>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button 
              variant="outline" 
              onClick={() => setRemoveConfirmOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemove}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Vehicles;