import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/manger/ui/button";
import { Input } from "@/components/manger/ui/input";
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
import { Textarea } from "@/components/manger/ui/textarea";
import { toast } from "@/components/manger/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, UserX, AlertTriangle, Phone, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface DoNotHireEntry {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  reason: string;
  incidentNotes: string;
  createdAt: string;
}

type DoNotHireApi = Omit<DoNotHireEntry, "id"> & {
  _id: string;
};

function normalizeEntry(e: DoNotHireApi): DoNotHireEntry {
  return {
    id: e._id,
    fullName: e.fullName,
    phone: e.phone,
    email: e.email,
    reason: e.reason,
    incidentNotes: e.incidentNotes,
    createdAt: e.createdAt,
  };
}

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  reason: z.string().min(1, "Reason is required"),
  incidentNotes: z.string().min(1, "Incident notes are required"),
});

type Values = z.infer<typeof schema>;

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
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
};

const searchVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
      delay: 0.1,
    },
  },
};

const tableVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      delay: 0.2,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  }),
  hover: {
    scale: 1.01,
    backgroundColor: "rgba(0,0,0,0.02)",
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 },
  },
};

const emptyStateVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
};

const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  tap: {
    scale: 0.95,
  },
};

export default function DoNotHire() {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ["do-not-hire"],
    queryFn: async () => {
      const res = await apiFetch<{ items: DoNotHireApi[] }>("/api/do-not-hire");
      return res.items.map(normalizeEntry);
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (payload: Omit<DoNotHireEntry, "id">) => {
      const res = await apiFetch<{ item: DoNotHireApi }>("/api/do-not-hire", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return normalizeEntry(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["do-not-hire"] });
    },
  });

  const entries = entriesQuery.data ?? [];

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      reason: "",
      incidentNotes: "",
    },
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      return (
        e.fullName.toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q)
      );
    });
  }, [entries, searchQuery]);

  const onSubmit = (values: Values) => {
    const now = new Date();
    const payload: Omit<DoNotHireEntry, "id"> = {
      fullName: values.fullName,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      email: values.email?.trim() ? values.email.trim() : undefined,
      reason: values.reason,
      incidentNotes: values.incidentNotes,
      createdAt: now.toISOString().slice(0, 10),
    };

    createEntryMutation.mutate(payload, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({
          title: "Entry added",
          description: "Do Not Hire record has been saved.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to add entry",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={headerVariants} className="flex items-center justify-between">
        <div className="page-header mb-0">
          <motion.h1 
            className="page-title"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            Do Not Hire List
          </motion.h1>
          <motion.p 
            className="page-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Track and review restricted candidates
          </motion.p>
        </div>
        <motion.div
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </motion.div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={searchVariants} className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, email, or reason..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </motion.div>

      {/* Table */}
      <motion.div 
        variants={tableVariants}
        className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
      >
        {entriesQuery.isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 text-sm text-muted-foreground flex items-center justify-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
            />
            Loading entries...
          </motion.div>
        ) : entriesQuery.isError ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 text-sm text-destructive flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {entriesQuery.error instanceof Error
              ? entriesQuery.error.message
              : "Failed to load entries"}
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div 
            variants={emptyStateVariants}
            className="p-12 text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"
            >
              <UserX className="w-8 h-8" />
            </motion.div>
            <h3 className="text-lg font-medium text-foreground mb-2">No entries found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search" : "Get started by adding your first entry"}
            </p>
            {!searchQuery && (
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Entry
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[720px]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Added</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((e, index) => (
                    <motion.tr
                      key={e.id}
                      custom={index}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover="hover"
                      layout
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <motion.p 
                            className="font-medium text-foreground"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 + 0.1 }}
                          >
                            {e.fullName}
                          </motion.p>
                          <motion.p 
                            className="text-xs text-muted-foreground mt-0.5 line-clamp-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 + 0.15 }}
                          >
                            {e.incidentNotes}
                          </motion.p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <motion.span 
                          className="text-sm text-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 + 0.2 }}
                        >
                          {e.reason}
                        </motion.span>
                      </td>
                      <td className="px-4 py-3">
                        <motion.div 
                          className="text-sm text-muted-foreground space-y-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 + 0.25 }}
                        >
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            <span>{e.phone ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            <span>{e.email ?? "—"}</span>
                          </div>
                        </motion.div>
                      </td>
                      <td className="px-4 py-3">
                        <motion.span 
                          className="text-sm text-muted-foreground whitespace-nowrap"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 + 0.3 }}
                        >
                          {new Date(e.createdAt).toLocaleDateString()}
                        </motion.span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Stats Footer */}
      {filtered.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-between items-center text-sm text-muted-foreground"
        >
          <span>Showing {filtered.length} of {entries.length} entries</span>
          <motion.div 
            className="flex items-center gap-2"
            animate={{ 
              scale: [1, 1.02, 1],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span>Restricted candidates</span>
          </motion.div>
        </motion.div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-destructive" />
                Add Do Not Hire Entry
              </DialogTitle>
              <DialogDescription>
                Save an incident record to prevent future hiring.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Candidate name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Input placeholder="Why is this candidate restricted?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incidentNotes"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Incident Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-[120px]" 
                            placeholder="Details..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button type="submit" className="gap-2 w-full">
                      <Plus className="w-4 h-4" />
                      Save
                    </Button>
                  </motion.div>
                </DialogFooter>
              </form>
            </Form>
          </motion.div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}