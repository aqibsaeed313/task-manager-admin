import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/manger/ui/button";
import { Input } from "@/components/manger/ui/input";
import { Badge } from "@/components/manger/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/manger/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/manger/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/manger/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/manger/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/manger/ui/alert-dialog";
import { toast } from "@/components/manger/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Plus,
  Search,
  Car,
  Fuel,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/manger/utils";
import { apiFetch } from "@/lib/manger/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Vehicle {
  id: string;
  name: string;
  type: string;
  licensePlate: string;
  status: "available" | "in-use" | "maintenance";
  assignedTo?: string;
  lastInspection: string;
  nextInspection: string;
  fuelLevel: number;
  mileage: number;
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

type VehicleApi = Omit<Vehicle, "id"> & {
  _id: string;
};

function normalizeVehicle(v: VehicleApi): Vehicle {
  const result = {
    id: v._id,
    name: v.name,
    type: v.type,
    licensePlate: v.licensePlate,
    status: v.status,
    assignedTo: v.assignedTo,
    lastInspection: v.lastInspection,
    nextInspection: v.nextInspection,
    fuelLevel: v.fuelLevel,
    mileage: v.mileage,
    tagPhotoFileName: v.tagPhotoFileName,
    tagPhotoDataUrl: v.tagPhotoDataUrl,
  };
  console.log("[DEBUG] normalizeVehicle:", v._id, "photo fields:", { 
    tagPhotoFileName: v.tagPhotoFileName, 
    hasDataUrl: !!v.tagPhotoDataUrl 
  });
  return result;
}

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

const statusStyles = {
  available: "bg-success/10 text-success",
  "in-use": "bg-primary/10 text-primary",
  maintenance: "bg-warning/10 text-warning",
};

const createVehicleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  licensePlate: z.string().min(1, "License plate is required"),
  status: z.enum(["available", "in-use", "maintenance"]),
  assignedTo: z.string().optional(),
  lastInspection: z.string().min(1, "Last inspection date is required"),
  nextInspection: z.string().min(1, "Next inspection date is required"),
  fuelLevel: z.coerce.number().min(0, "Min 0").max(100, "Max 100"),
  mileage: z.coerce.number().min(0, "Must be 0 or greater"),
  tagPhotoFileName: z.string().optional(),
  tagPhotoDataUrl: z.string().optional(),
});

type CreateVehicleValues = z.infer<typeof createVehicleSchema>;

export default function Vehicles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [tagPhotoFile, setTagPhotoFile] = useState<File | null>(null);
  const [editTagPhotoFile, setEditTagPhotoFile] = useState<File | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const queryClient = useQueryClient();

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Fetch employees on mount
  useEffect(() => {
    let mounted = true;
    const loadEmployees = async () => {
      try {
        let allEmployees: Employee[] = [];
        
        // Fetch employees from employees API
        try {
          const res = await apiFetch<{ items: Employee[] }>("/api/employees");
          if (mounted) {
            allEmployees = res.items.filter((e) => e.status === "active");
          }
        } catch (empErr) {
          console.error("Failed to load employees:", empErr);
        }
        
        // Fetch users with employee role from users API
        try {
          const userRes = await apiFetch<{ items: User[] }>("/api/users");
          if (mounted) {
            const employeeUsers = userRes.items
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
        console.error("Failed to load employees:", e);
      }
    };
    
    void loadEmployees();
    return () => {
      mounted = false;
    };
  }, []);

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await apiFetch<{ items: VehicleApi[] }>("/api/vehicles");
      console.log("[DEBUG] Vehicles response:", res.items.map((v: any) => ({ 
        id: v._id, 
        name: v.name, 
        tagPhotoFileName: v.tagPhotoFileName, 
        tagPhotoDataUrl: v.tagPhotoDataUrl ? v.tagPhotoDataUrl.substring(0, 50) + "..." : "empty" 
      })));
      return res.items.map(normalizeVehicle);
    },
  });

  const vehicles = vehiclesQuery.data ?? [];

  const createVehicleMutation = useMutation({
    mutationFn: async (payload: Omit<Vehicle, "id">) => {
      const res = await apiFetch<{ item: VehicleApi }>("/api/vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return normalizeVehicle(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateVehicleValues }) => {
      const nextPayload = {
        ...payload,
        assignedTo: payload.assignedTo?.trim() ? payload.assignedTo.trim() : undefined,
      };
      const res = await apiFetch<{ item: VehicleApi }>(`/api/vehicles/${id}`, {
        method: "PUT",
        body: JSON.stringify(nextPayload),
      });
      return normalizeVehicle(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ ok: true }>(`/api/vehicles/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const form = useForm<CreateVehicleValues>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      name: "",
      type: "",
      licensePlate: "",
      status: "available",
      assignedTo: "",
      lastInspection: "",
      nextInspection: "",
      fuelLevel: 75,
      mileage: 0,
      tagPhotoFileName: "",
      tagPhotoDataUrl: "",
    },
  });

  const editForm = useForm<CreateVehicleValues>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      name: "",
      type: "",
      licensePlate: "",
      status: "available",
      assignedTo: "",
      lastInspection: "",
      nextInspection: "",
      fuelLevel: 75,
      mileage: 0,
      tagPhotoFileName: "",
      tagPhotoDataUrl: "",
    },
  });

  const onCreateVehicle = (values: CreateVehicleValues) => {
    const payload: Omit<Vehicle, "id"> = {
      name: values.name,
      type: values.type,
      licensePlate: values.licensePlate,
      status: values.status,
      assignedTo: values.assignedTo?.trim() ? values.assignedTo.trim() : undefined,
      lastInspection: values.lastInspection,
      nextInspection: values.nextInspection,
      fuelLevel: values.fuelLevel,
      mileage: values.mileage,
      tagPhotoFileName: values.tagPhotoFileName || "",
      tagPhotoDataUrl: values.tagPhotoDataUrl || "",
    };

    createVehicleMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setTagPhotoFile(null);
        form.reset();
        toast({
          title: "Vehicle added",
          description: "New vehicle has been added.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to add vehicle",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  const openView = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsViewOpen(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditTagPhotoFile(null);
    editForm.reset({
      name: vehicle.name,
      type: vehicle.type,
      licensePlate: vehicle.licensePlate,
      status: vehicle.status,
      assignedTo: vehicle.assignedTo ?? "",
      lastInspection: vehicle.lastInspection,
      nextInspection: vehicle.nextInspection,
      fuelLevel: vehicle.fuelLevel,
      mileage: vehicle.mileage,
      tagPhotoFileName: vehicle.tagPhotoFileName || "",
      tagPhotoDataUrl: vehicle.tagPhotoDataUrl || "",
    });
    setIsEditOpen(true);
  };

  const openDelete = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteOpen(true);
  };

  const onEditVehicle = (values: CreateVehicleValues) => {
    if (!selectedVehicle) return;

    updateVehicleMutation.mutate(
      { id: selectedVehicle.id, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          toast({
            title: "Vehicle updated",
            description: "Vehicle record has been updated.",
          });
        },
        onError: (err) => {
          toast({
            title: "Failed to update vehicle",
            description: err instanceof Error ? err.message : "Something went wrong",
          });
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!selectedVehicle) return;
    const toDelete = selectedVehicle;

    deleteVehicleMutation.mutate(toDelete.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedVehicle(null);
        toast({
          title: "Vehicle deleted",
          description: "Vehicle has been removed.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to delete vehicle",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const availableCount = useMemo(() => vehicles.filter((v) => v.status === "available").length, [vehicles]);
  const inUseCount = useMemo(() => vehicles.filter((v) => v.status === "in-use").length, [vehicles]);
  const maintenanceCount = useMemo(() => vehicles.filter((v) => v.status === "maintenance").length, [vehicles]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Vehicles Management</h1>
          <p className="page-subtitle">Track and manage company vehicles</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Vehicle
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
            <DialogDescription>
              Add a new vehicle record.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateVehicle)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ford Transit Van #6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Van" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ABC-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="in-use">In Use</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.name}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {employees.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">No employees found</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fuelLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Level (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mileage</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastInspection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Inspection</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextInspection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Inspection</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Vehicle Photo Upload */}
              <div className="space-y-2">
                <FormLabel>Vehicle Photo</FormLabel>
                <div
                  className="w-full rounded-lg border border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => document.getElementById("vehicle-photo-input")?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) {
                      setTagPhotoFile(f);
                      void readFileAsDataUrl(f).then((url) => {
                        form.setValue("tagPhotoFileName", f.name);
                        form.setValue("tagPhotoDataUrl", url);
                      });
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {tagPhotoFile ? tagPhotoFile.name : form.watch("tagPhotoFileName") || "Click to choose or drag & drop"}
                    </p>
                    <p className="text-xs text-muted-foreground">Max 10MB</p>
                  </div>
                  <input
                    id="vehicle-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setTagPhotoFile(f);
                        void readFileAsDataUrl(f).then((url) => {
                          form.setValue("tagPhotoFileName", f.name);
                          form.setValue("tagPhotoDataUrl", url);
                        });
                      }
                    }}
                  />
                </div>
                {form.watch("tagPhotoDataUrl") && (
                  <div className="mt-2">
                    <img 
                      src={form.watch("tagPhotoDataUrl")} 
                      alt="Vehicle preview" 
                      className="h-20 w-20 object-cover rounded-lg border" 
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) setSelectedVehicle(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vehicle Details</DialogTitle>
            <DialogDescription>View vehicle record information.</DialogDescription>
          </DialogHeader>

          {selectedVehicle && (
            <div className="space-y-4">
              {/* Vehicle Photo */}
              {(() => {
                const photoSrc = getVehicleTagPhotoSrc(selectedVehicle);
                return photoSrc ? (
                  <div className="flex justify-center">
                    <img 
                      src={photoSrc} 
                      alt={selectedVehicle.name}
                      className="h-24 w-24 object-cover rounded-xl border-2 ring-2 ring-primary/20 shadow-lg"
                    />
                  </div>
                ) : null;
              })()}

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Car className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {selectedVehicle.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedVehicle.licensePlate}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  <p className="text-foreground capitalize">
                    {selectedVehicle.status.replace("-", " ")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Type</p>
                  <p className="text-foreground">{selectedVehicle.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Assigned To</p>
                  <p className="text-foreground">{selectedVehicle.assignedTo ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Fuel Level</p>
                  <p className="text-foreground">{selectedVehicle.fuelLevel}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Mileage</p>
                  <p className="text-foreground">{selectedVehicle.mileage.toLocaleString()} mi</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Last Inspection</p>
                  <p className="text-foreground">{new Date(selectedVehicle.lastInspection).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Next Inspection</p>
                  <p className="text-foreground">{new Date(selectedVehicle.nextInspection).toLocaleDateString()}</p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!selectedVehicle) return;
                    setIsViewOpen(false);
                    openEdit(selectedVehicle);
                  }}
                >
                  Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedVehicle(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>Update vehicle record details.</DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditVehicle)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ford Transit Van #6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Van" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ABC-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="in-use">In Use</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.name}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="fuelLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Level (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="mileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mileage</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="lastInspection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Inspection</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="nextInspection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Inspection</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Vehicle Photo Upload - Edit */}
              <div className="space-y-2">
                <FormLabel>Vehicle Photo</FormLabel>
                <div
                  className="w-full rounded-lg border border-dashed border-border p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => document.getElementById("edit-vehicle-photo-input")?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) {
                      setEditTagPhotoFile(f);
                      void readFileAsDataUrl(f).then((url) => {
                        editForm.setValue("tagPhotoFileName", f.name);
                        editForm.setValue("tagPhotoDataUrl", url);
                      });
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {editTagPhotoFile ? editTagPhotoFile.name : editForm.watch("tagPhotoFileName") || "Click to choose or drag & drop"}
                    </p>
                    <p className="text-xs text-muted-foreground">Max 10MB</p>
                  </div>
                  <input
                    id="edit-vehicle-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setEditTagPhotoFile(f);
                        void readFileAsDataUrl(f).then((url) => {
                          editForm.setValue("tagPhotoFileName", f.name);
                          editForm.setValue("tagPhotoDataUrl", url);
                        });
                      }
                    }}
                  />
                </div>
                {editForm.watch("tagPhotoDataUrl") && (
                  <div className="mt-2">
                    <img 
                      src={editForm.watch("tagPhotoDataUrl")} 
                      alt="Vehicle preview" 
                      className="h-20 w-20 object-cover rounded-lg border" 
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the vehicle record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-success">
                {availableCount}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-success/50" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Use</p>
              <p className="text-2xl font-bold text-primary">
                {inUseCount}
              </p>
            </div>
            <Car className="w-8 h-8 text-primary/50" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Maintenance</p>
              <p className="text-2xl font-bold text-warning">
                {maintenanceCount}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning/50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or license plate..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="in-use">In Use</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehiclesQuery.isLoading ? (
          <div className="col-span-full p-6 text-sm text-muted-foreground">Loading vehicles...</div>
        ) : vehiclesQuery.isError ? (
          <div className="col-span-full p-6 text-sm text-destructive">
            {vehiclesQuery.error instanceof Error
              ? vehiclesQuery.error.message
              : "Failed to load vehicles"}
          </div>
        ) : null}

        {filteredVehicles.map((vehicle, index) => (
          <div
            key={vehicle.id}
            className="bg-card rounded-xl border border-border shadow-card p-6 hover:shadow-card-hover transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {(() => {
                  const photoSrc = getVehicleTagPhotoSrc(vehicle);
                  console.log(`[DEBUG CARD] ${vehicle.name} (${vehicle.id}): photoSrc =`, photoSrc ? photoSrc.substring(0, 50) + "..." : "null");
                  return photoSrc ? (
                    <img src={photoSrc} alt={vehicle.name} className="h-12 w-12 rounded-xl object-cover ring-2 ring-primary/20" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-2 ring-primary/20">
                      <Car className="w-6 h-6 text-primary" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-semibold text-foreground">{vehicle.name}</h3>
                  <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Vehicle actions"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openView(vehicle)}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(vehicle)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openDelete(vehicle)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between mb-4">
              <Badge
                variant="secondary"
                className={cn("capitalize", statusStyles[vehicle.status])}
              >
                {vehicle.status.replace("-", " ")}
              </Badge>
              <Badge variant="outline">{vehicle.type}</Badge>
            </div>

            {vehicle.assignedTo && (
              <p className="text-sm text-muted-foreground mb-4">
                Assigned to:{" "}
                <span className="text-foreground font-medium">{vehicle.assignedTo}</span>
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Fuel className="w-4 h-4" />
                  <span>Fuel Level</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        vehicle.fuelLevel > 50
                          ? "bg-success"
                          : vehicle.fuelLevel > 25
                          ? "bg-warning"
                          : "bg-destructive",
                      )}
                      style={{ width: `${vehicle.fuelLevel}%` }}
                    />
                  </div>
                  <span className="text-foreground font-medium">{vehicle.fuelLevel}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mileage</span>
                <span className="text-foreground font-medium">
                  {vehicle.mileage.toLocaleString()} mi
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Next Inspection</span>
                </div>
                <span className="text-foreground">
                  {new Date(vehicle.nextInspection).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
