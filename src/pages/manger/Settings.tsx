import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/manger/ui/button";
import { Input } from "@/components/manger/ui/input";
import { User, Shield, Save, Camera } from "lucide-react";
import { apiFetch } from "@/lib/manger/api";
import { toast } from "@/components/manger/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAuthState } from "@/lib/auth";

type SettingsItem = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
  notifications?: {
    emailNotifications?: boolean;
    taskAlerts?: boolean;
    employeeUpdates?: boolean;
    weeklyReports?: boolean;
  };
  language?: string;
  timezone?: string;
};

export default function Settings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{ item: SettingsItem }>("/api/settings");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiFetch<{ item: any }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      return apiFetch<{ ok: true }>("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      
      const auth = getAuthState();
      const token = auth.token;
      
      // Use full backend URL for file upload
      const API_BASE = "https://task-manager-backend-theta-ten.vercel.app";
      
      const res = await fetch(`${API_BASE}/api/settings/avatar`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errorData.error?.message || errorData.message || "Failed to upload avatar");
      }
      return res.json();
    },
  });

  const [draft, setDraft] = useState<any>(null);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settingsQuery.data?.item) {
      setDraft(settingsQuery.data.item);
    }
  }, [settingsQuery.data]);

  const onSave = () => {
    if (!draft) return;

    saveMutation.mutate(draft, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["settings"] });
        toast({ title: "Saved", description: "Settings updated." });
      },
      onError: (err) => {
        toast({
          title: "Failed to save",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      },
    });
  };

  const setNotification = (key: string, value: boolean) => {
    setDraft((p: any) => {
      const next = {
        ...(p || {}),
        notifications: {
          ...((p && p.notifications) || {}),
          [key]: value,
        },
      };

      saveMutation.mutate(next, {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["settings"] });
        },
      });

      return next;
    });
  };

  const onChangePassword = () => {
    const currentPassword = passwordDraft.currentPassword;
    const newPassword = passwordDraft.newPassword;
    const confirmNewPassword = passwordDraft.confirmNewPassword;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({ title: "Missing fields", description: "Please fill all password fields." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Password mismatch", description: "New password and confirm password do not match." });
      return;
    }

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordDraft({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
          toast({ title: "Password updated", description: "Please use the new password next time you log in." });
        },
        onError: (err) => {
          toast({
            title: "Failed to change password",
            description: err instanceof Error ? err.message : "Something went wrong",
          });
        },
      }
    );
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    avatarUploadMutation.mutate(file, {
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: ["settings"] });
        toast({ title: "Success", description: "Profile picture updated." });
        const newAvatarUrl = data.avatarDataUrl || data.avatarUrl;
        if (newAvatarUrl) {
          setDraft((p: any) => ({ ...p, avatarUrl: newAvatarUrl }));
        }
      },
      onError: (err) => {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Failed to upload image",
        });
      },
    });
  };

  const initials = draft?.fullName
    ?.split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "M";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Profile Settings</h3>
            <p className="text-sm text-muted-foreground">
              Update your personal information
            </p>
          </div>
        </div>

        {/* Profile Picture */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-border">
              {draft?.avatarUrl ? (
                <AvatarImage src={draft.avatarUrl} alt={draft?.fullName || "User"} />
              ) : (
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <button
              onClick={handleAvatarClick}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
              title="Change profile picture"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <p className="font-medium text-foreground">Profile Picture</p>
            <p className="text-sm text-muted-foreground">
              Click the camera icon to upload a new photo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Full Name
            </label>
            <Input
              value={draft?.fullName ?? ""}
              onChange={(e) => setDraft((p: any) => ({ ...p, fullName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Email Address
            </label>
            <Input
              value={draft?.email ?? ""}
              onChange={(e) => setDraft((p: any) => ({ ...p, email: e.target.value }))}
              type="email"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Phone Number
            </label>
            <Input
              value={draft?.phone ?? ""}
              onChange={(e) => setDraft((p: any) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Role
            </label>
            <Input value={draft?.role ?? ""} disabled />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Security</h3>
            <p className="text-sm text-muted-foreground">
              Manage your security preferences
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Current Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={passwordDraft.currentPassword}
              onChange={(e) => setPasswordDraft((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                New Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={passwordDraft.newPassword}
                onChange={(e) => setPasswordDraft((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Confirm New Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={passwordDraft.confirmNewPassword}
                onChange={(e) => setPasswordDraft((p) => ({ ...p, confirmNewPassword: e.target.value }))}
              />
            </div>
          </div>
          <Button variant="outline" onClick={onChangePassword} disabled={changePasswordMutation.isPending}>
            Change Password
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="gap-2" onClick={onSave} disabled={saveMutation.isPending || settingsQuery.isLoading}>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
