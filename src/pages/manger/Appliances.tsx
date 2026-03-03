import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
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
  Wrench,
  MapPin,
  Calendar,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Grid,
  List,
} from "lucide-react";
import { cn } from "@/lib/manger/utils";
import { apiFetch } from "@/lib/manger/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Appliance {
  id: string;
  name: string;
  type: "residential" | "commercial";
  location: string;
  purchaseDate: string;
  warrantyUntil: string;
  status: "active" | "inactive";
  assignedTo?: string;
  tagPhotoFileName?: string;
  tagPhotoDataUrl?: string;
}

type ApplianceApi = {
  id?: string;
  _id?: string;
  name?: string;
  type?: string;
  location?: string;
  purchaseDate?: string;
  warrantyUntil?: string;
  status?: string;
  assignedTo?: string;
  tagPhotoFileName?: string;
  tagPhotoDataUrl?: string;
};

function normalizeAppliance(a: ApplianceApi): Appliance {
  const id = String(a.id || a._id || "");
  return {
    id,
    name: String(a.name || ""),
    type: (String(a.type || "commercial") === "residential" ? "residential" : "commercial"),
    location: String(a.location || ""),
    purchaseDate: String(a.purchaseDate || ""),
    warrantyUntil: String(a.warrantyUntil || ""),
    status: (String(a.status || "active") === "inactive" ? "inactive" : "active"),
    assignedTo: a.assignedTo ? String(a.assignedTo) : undefined,
    tagPhotoFileName: a.tagPhotoFileName ? String(a.tagPhotoFileName) : undefined,
    tagPhotoDataUrl: a.tagPhotoDataUrl ? String(a.tagPhotoDataUrl) : undefined,
  };
}

const statusStyles = {
  active: "bg-success/10 text-success",
  inactive: "bg-muted text-muted-foreground",
} as const;

const statusIcons = {
  active: CheckCircle2,
  inactive: AlertCircle,
} as const;

const createApplianceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["residential", "commercial"]),
  location: z.string().min(1, "Location is required"),
  purchaseDate: z.string().optional(),
  warrantyUntil: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  assignedTo: z.string().optional(),
  tagPhotoFileName: z.string().optional(),
  tagPhotoDataUrl: z.string().optional(),
});

type CreateApplianceValues = z.infer<typeof createApplianceSchema>;

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
      stiffness: 300,
      damping: 24,
    },
  },
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
  hover: {
    scale: 1.02,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
};

const filterBarVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 30,
      delay: 0.1,
    },
  },
};

const statsVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 30,
      delay: 0.3,
    },
  },
};

export default function Appliances() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const queryClient = useQueryClient();

  const [createTagPhotoFile, setCreateTagPhotoFile] = useState<File | null>(null);
  const [editTagPhotoFile, setEditTagPhotoFile] = useState<File | null>(null);

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

  const appliancesQuery = useQuery({
    queryKey: ["appliances"],
    queryFn: async () => {
      const res = await apiFetch<{ items?: ApplianceApi[] } | ApplianceApi[]>("/api/appliances");
      const items = Array.isArray(res) ? res : Array.isArray(res.items) ? res.items : [];
      return items.map(normalizeAppliance).filter((a) => Boolean(a.id));
    },
  });

  const appliances = appliancesQuery.data ?? [];

  const createApplianceMutation = useMutation({
    mutationFn: async (payload: Omit<Appliance, "id">) => {
      const res = await apiFetch<{ item: ApplianceApi }>("/api/appliances", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return normalizeAppliance(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appliances"] });
    },
  });

  const updateApplianceMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateApplianceValues }) => {
      const nextPayload = {
        ...payload,
        assignedTo: payload.assignedTo?.trim() ? payload.assignedTo.trim() : undefined,
      };
      const res = await apiFetch<{ item: ApplianceApi }>(`/api/appliances/${id}`, {
        method: "PUT",
        body: JSON.stringify(nextPayload),
      });
      return normalizeAppliance(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appliances"] });
    },
  });

  const deleteApplianceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ ok: true }>(`/api/appliances/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appliances"] });
    },
  });

  const form = useForm<CreateApplianceValues>({
    resolver: zodResolver(createApplianceSchema),
    defaultValues: {
      name: "",
      type: "commercial",
      status: "active",
      location: "",
      purchaseDate: "",
      warrantyUntil: "",
      assignedTo: "",
      tagPhotoFileName: "",
      tagPhotoDataUrl: "",
    },
  });

  const editForm = useForm<CreateApplianceValues>({
    resolver: zodResolver(createApplianceSchema),
    defaultValues: {
      name: "",
      type: "commercial",
      status: "active",
      location: "",
      purchaseDate: "",
      warrantyUntil: "",
      assignedTo: "",
      tagPhotoFileName: "",
      tagPhotoDataUrl: "",
    },
  });

  const onCreateAppliance = async (values: CreateApplianceValues) => {
    let tagPhotoDataUrl = String(values.tagPhotoDataUrl || "").trim();
    if (!tagPhotoDataUrl && createTagPhotoFile) {
      try {
        tagPhotoDataUrl = await readFileAsDataUrl(createTagPhotoFile);
      } catch {
        tagPhotoDataUrl = "";
      }
    }

    const payload: Omit<Appliance, "id"> = {
      name: values.name,
      type: values.type,
      location: values.location,
      purchaseDate: values.purchaseDate || "",
      warrantyUntil: values.warrantyUntil || "",
      status: values.status,
      assignedTo: values.assignedTo?.trim() ? values.assignedTo.trim() : undefined,
      tagPhotoFileName: values.tagPhotoFileName?.trim() ? values.tagPhotoFileName.trim() : undefined,
      tagPhotoDataUrl: tagPhotoDataUrl || undefined,
    };

    createApplianceMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
        setCreateTagPhotoFile(null);
        toast({
          title: "Appliance added",
          description: "New appliance has been added.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to add appliance",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  const openView = (appliance: Appliance) => {
    setSelectedAppliance(appliance);
    setIsViewOpen(true);
  };

  const openEdit = (appliance: Appliance) => {
    setSelectedAppliance(appliance);
    setEditTagPhotoFile(null);
    editForm.reset({
      name: appliance.name,
      status: appliance.status,
      location: appliance.location,
      type: appliance.type,
      purchaseDate: appliance.purchaseDate,
      warrantyUntil: appliance.warrantyUntil,
      assignedTo: appliance.assignedTo ?? "",
      tagPhotoFileName: appliance.tagPhotoFileName ?? "",
      tagPhotoDataUrl: appliance.tagPhotoDataUrl ?? "",
    });
    setIsEditOpen(true);
  };

  const openDelete = (appliance: Appliance) => {
    setSelectedAppliance(appliance);
    setIsDeleteOpen(true);
  };

  const onEditAppliance = async (values: CreateApplianceValues) => {
    if (!selectedAppliance) return;

    let tagPhotoDataUrl = String(values.tagPhotoDataUrl || "").trim();
    if (editTagPhotoFile) {
      try {
        tagPhotoDataUrl = await readFileAsDataUrl(editTagPhotoFile);
      } catch {
        tagPhotoDataUrl = "";
      }
    }

    const nextValues: CreateApplianceValues = {
      ...values,
      tagPhotoDataUrl,
    };

    updateApplianceMutation.mutate(
      { id: selectedAppliance.id, payload: nextValues },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          toast({
            title: "Appliance updated",
            description: "Appliance record has been updated.",
          });
        },
        onError: (err) => {
          toast({
            title: "Failed to update appliance",
            description: err instanceof Error ? err.message : "Something went wrong",
          });
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!selectedAppliance) return;
    const toDelete = selectedAppliance;

    deleteApplianceMutation.mutate(toDelete.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedAppliance(null);
        toast({
          title: "Appliance deleted",
          description: "Appliance has been removed.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to delete appliance",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  const filteredAppliances = useMemo(() => {
    return appliances.filter((appliance) => {
      const matchesSearch =
        appliance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appliance.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(appliance.assignedTo || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || appliance.status === statusFilter;
      const matchesType =
        typeFilter === "all" || appliance.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [appliances, searchQuery, statusFilter, typeFilter]);

  const activeCount = useMemo(() => appliances.filter((a) => a.status === "active").length, [appliances]);
  const inactiveCount = useMemo(() => appliances.filter((a) => a.status === "inactive").length, [appliances]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-4 sm:space-y-6 px-2 sm:px-4 md:px-6"
    >
      {/* Header - Responsive */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="page-title text-xl sm:text-2xl md:text-3xl"
          >
            Appliances Management
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="page-subtitle text-sm sm:text-base text-muted-foreground"
          >
            Track equipment and appliance inventory
          </motion.p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            className="gap-2 w-full sm:w-auto" 
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="sm:inline">Add Appliance</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* Filters - Responsive */}
      <motion.div variants={filterBarVariants} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <motion.div 
          className="relative flex-1"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or serial number..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>
        
        {/* Filter Buttons - Horizontal scroll on mobile */}
        <motion.div 
          className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.2 }
            }
          }}
        >
          <motion.div variants={itemVariants}>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] sm:w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* View Toggle - Hidden on mobile, shown on tablet/desktop */}
          <motion.div 
            variants={itemVariants}
            className="hidden sm:flex border rounded-lg p-1"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="px-2"
                onClick={() => setViewMode("table")}
              >
                <List className="w-4 h-4" />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="px-2"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Responsive Content - Table for desktop, Cards for mobile */}
      <motion.div 
        variants={itemVariants}
        className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
      >
        {appliancesQuery.isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 sm:p-6 text-sm text-muted-foreground"
          >
            Loading appliances...
          </motion.div>
        ) : appliancesQuery.isError ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 sm:p-6 text-sm text-destructive"
          >
            {appliancesQuery.error instanceof Error
              ? appliancesQuery.error.message
              : "Failed to load appliances"}
          </motion.div>
        ) : filteredAppliances.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center text-muted-foreground"
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              No appliances found
            </motion.p>
          </motion.div>
        ) : (
          <>
            {/* Mobile View - Card Grid (Always visible on mobile) */}
            <div className="block sm:hidden">
              <AnimatePresence mode="popLayout">
                {filteredAppliances.map((appliance) => {
                  const StatusIcon = statusIcons[appliance.status];
                  const tagSrc = getApplianceTagPhotoSrc(appliance);

                  return (
                    <motion.div
                      key={appliance.id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover="hover"
                      layout
                      className="p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0 border-border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <motion.div 
                            className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"
                            whileHover={{ rotate: 15, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          >
                            {tagSrc ? (
                              <img src={tagSrc} alt={appliance.name} className="h-full w-full rounded-lg object-contain bg-white/60" />
                            ) : (
                              <Wrench className="w-5 h-5" />
                            )}
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {appliance.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{appliance.id}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-2 flex-shrink-0"
                              aria-label="Appliance actions"
                            >
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </motion.button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(appliance)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(appliance)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDelete(appliance)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <motion.div 
                        className="grid grid-cols-2 gap-2 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {appliance.type}
                          </Badge>
                        </div>
                        <div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "capitalize gap-1 text-xs",
                              statusStyles[appliance.status]
                            )}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {appliance.status}
                          </Badge>
                        </div>
                      </motion.div>

                      <motion.div 
                        className="grid grid-cols-2 gap-2 mt-2 text-xs"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{appliance.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{appliance.warrantyUntil || "—"}</span>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Tablet/Desktop View - Table (Hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left">Appliance</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Warranty Until</th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredAppliances.map((appliance, index) => {
                      const StatusIcon = statusIcons[appliance.status];
                      const tagSrc = getApplianceTagPhotoSrc(appliance);

                      return (
                        <motion.tr
                          key={appliance.id}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          custom={index}
                          whileHover={{ 
                            backgroundColor: "rgba(0,0,0,0.02)",
                            transition: { duration: 0.2 }
                          }}
                          layout
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <motion.div 
                                className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"
                                whileHover={{ rotate: 15, scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                              >
                                {tagSrc ? (
                                  <img src={tagSrc} alt={appliance.name} className="h-full w-full rounded-lg object-contain bg-white/60" />
                                ) : (
                                  <Wrench className="w-5 h-5" />
                                )}
                              </motion.div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate max-w-[200px]">
                                  {appliance.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{appliance.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            >
                              <Badge variant="outline">{appliance.type}</Badge>
                            </motion.div>
                          </td>
                          <td className="px-4 py-3">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            >
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "capitalize gap-1",
                                  statusStyles[appliance.status]
                                )}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {appliance.status}
                              </Badge>
                            </motion.div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{appliance.location}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{appliance.warrantyUntil || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                  aria-label="Appliance actions"
                                >
                                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </motion.button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openView(appliance)}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(appliance)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openDelete(appliance)}>
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

      {/* Stats - Responsive */}
      <motion.div 
        variants={statsVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-muted-foreground"
      >
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center sm:text-left"
        >
          Showing {filteredAppliances.length} of {appliances.length} appliances
        </motion.span>
        
        {/* Status Indicators - Horizontal scroll on mobile */}
        <motion.div 
          className="flex items-center justify-center sm:justify-end gap-4 overflow-x-auto pb-1 sm:pb-0"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.5 }
            }
          }}
        >
          <motion.span 
            variants={itemVariants}
            className="flex items-center gap-1.5 whitespace-nowrap"
          >
            <motion.span 
              className="w-2 h-2 rounded-full bg-success"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {activeCount} active
          </motion.span>
          <motion.span 
            variants={itemVariants}
            className="flex items-center gap-1.5 whitespace-nowrap"
          >
            <motion.span 
              className="w-2 h-2 rounded-full bg-muted"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            {inactiveCount} inactive
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Dialogs - Already responsive due to shadcn/ui */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Appliance</DialogTitle>
            <DialogDescription>
              Add a new appliance record.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateAppliance)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Commercial Refrigerator CR-2" {...field} />
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="residential">Residential</SelectItem>
                        </SelectContent>
                      </Select>
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
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Warehouse A" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warrantyUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty Until</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tagPhotoFileName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Tag Photo</FormLabel>
                      {getApplianceTagPhotoSrc({ tagPhotoDataUrl: form.watch("tagPhotoDataUrl"), tagPhotoFileName: field.value }) && (
                        <div className="w-full overflow-hidden rounded-xl border bg-muted/10 mb-2">
                          <img
                            src={getApplianceTagPhotoSrc({ tagPhotoDataUrl: form.watch("tagPhotoDataUrl"), tagPhotoFileName: field.value }) || ""}
                            alt={form.watch("name") || "Tag photo"}
                            className="w-full h-44 sm:h-64 object-contain bg-white"
                          />
                        </div>
                      )}
                      <FormControl>
                        <div className="w-full">
                          <input
                            type="file"
                            className="block w-full text-sm"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setCreateTagPhotoFile(f);
                              if (!f) {
                                form.setValue("tagPhotoFileName", "");
                                form.setValue("tagPhotoDataUrl", "");
                                return;
                              }
                              form.setValue("tagPhotoFileName", f.name);
                              void readFileAsDataUrl(f)
                                .then((dataUrl) => form.setValue("tagPhotoDataUrl", dataUrl))
                                .catch(() => form.setValue("tagPhotoDataUrl", ""));
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="gap-2 w-full sm:w-auto">
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
          if (!open) setSelectedAppliance(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appliance Details</DialogTitle>
            <DialogDescription>View appliance record information.</DialogDescription>
          </DialogHeader>

          {selectedAppliance && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-4"
            >
              {getApplianceTagPhotoSrc(selectedAppliance) && (
                <div className="w-full overflow-hidden rounded-xl border bg-muted/10">
                  <img
                    src={getApplianceTagPhotoSrc(selectedAppliance) || ""}
                    alt={selectedAppliance.name}
                    className="w-full h-44 sm:h-64 object-contain bg-white"
                  />
                </div>
              )}
              <div className="flex items-center gap-4">
                <motion.div 
                  className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {getApplianceTagPhotoSrc(selectedAppliance) ? (
                    <img
                      src={getApplianceTagPhotoSrc(selectedAppliance) || ""}
                      alt={selectedAppliance.name}
                      className="h-full w-full rounded-xl object-contain bg-white/60"
                    />
                  ) : (
                    <Wrench className="w-6 h-6" />
                  )}
                </motion.div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {selectedAppliance.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{selectedAppliance.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-muted-foreground">Status</p>
                  <p className="text-foreground capitalize">
                    {selectedAppliance.status}
                  </p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <p className="text-muted-foreground">Type</p>
                  <p className="text-foreground">{selectedAppliance.type}</p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-muted-foreground">Location</p>
                  <p className="text-foreground">{selectedAppliance.location}</p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <p className="text-muted-foreground">Assigned To</p>
                  <p className="text-foreground">{selectedAppliance.assignedTo ?? "—"}</p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-muted-foreground">Purchase Date</p>
                  <p className="text-foreground">{selectedAppliance.purchaseDate || "—"}</p>
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <p className="text-muted-foreground">Warranty Until</p>
                  <p className="text-foreground">{selectedAppliance.warrantyUntil || "—"}</p>
                </motion.div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto">
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!selectedAppliance) return;
                    setIsViewOpen(false);
                    openEdit(selectedAppliance);
                  }}
                  className="w-full sm:w-auto"
                >
                  Edit
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedAppliance(null);
        }}
      >
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appliance</DialogTitle>
            <DialogDescription>Update appliance record details.</DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditAppliance)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Commercial Refrigerator CR-2" {...field} />
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="residential">Residential</SelectItem>
                        </SelectContent>
                      </Select>
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
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Warehouse A" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="warrantyUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty Until</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="tagPhotoFileName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Tag Photo</FormLabel>
                      {getApplianceTagPhotoSrc({ tagPhotoDataUrl: editForm.watch("tagPhotoDataUrl"), tagPhotoFileName: field.value }) && (
                        <div className="w-full overflow-hidden rounded-xl border bg-muted/10 mb-2">
                          <img
                            src={getApplianceTagPhotoSrc({ tagPhotoDataUrl: editForm.watch("tagPhotoDataUrl"), tagPhotoFileName: field.value }) || ""}
                            alt={editForm.watch("name") || "Tag photo"}
                            className="w-full h-44 sm:h-64 object-contain bg-white"
                          />
                        </div>
                      )}
                      <FormControl>
                        <div className="w-full flex flex-col sm:flex-row gap-2 sm:items-center">
                          <input
                            type="file"
                            className="block w-full text-sm"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setEditTagPhotoFile(f);
                              if (!f) return;
                              editForm.setValue("tagPhotoFileName", f.name);
                              void readFileAsDataUrl(f)
                                .then((dataUrl) => editForm.setValue("tagPhotoDataUrl", dataUrl))
                                .catch(() => editForm.setValue("tagPhotoDataUrl", ""));
                            }}
                          />
                          {(field.value || editForm.watch("tagPhotoDataUrl")) && (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => {
                                setEditTagPhotoFile(null);
                                editForm.setValue("tagPhotoFileName", "");
                                editForm.setValue("tagPhotoDataUrl", "");
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appliance?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the appliance record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="w-full sm:w-auto">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}