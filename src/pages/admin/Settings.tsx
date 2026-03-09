import React, { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Camera, User } from "lucide-react";
import { apiFetch } from "@/lib/admin/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SettingsState = {
  companyName: string;
  supportEmail: string;
  timezone: string;
  notificationsEnabled: boolean;
  autoLogoutMinutes: number;
  fullName: string;
  email: string;
  avatarUrl: string;
};

const SETTINGS_STORAGE_KEY = "app_settings";

const defaultSettings: SettingsState = {
  companyName: "TaskFlow",
  supportEmail: "support@taskflow.com",
  timezone: "UTC+05:00",
  notificationsEnabled: true,
  autoLogoutMinutes: 0,
  fullName: "",
  email: "",
  avatarUrl: "",
};

function loadSettings(): SettingsState {
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!saved) return defaultSettings;
  try {
    const parsed = JSON.parse(saved) as Partial<SettingsState>;
    return {
      companyName: parsed.companyName ?? defaultSettings.companyName,
      supportEmail: parsed.supportEmail ?? defaultSettings.supportEmail,
      timezone: parsed.timezone ?? defaultSettings.timezone,
      notificationsEnabled: parsed.notificationsEnabled ?? defaultSettings.notificationsEnabled,
      autoLogoutMinutes: parsed.autoLogoutMinutes ?? defaultSettings.autoLogoutMinutes,
      fullName: parsed.fullName ?? defaultSettings.fullName,
      email: parsed.email ?? defaultSettings.email,
      avatarUrl: parsed.avatarUrl ?? defaultSettings.avatarUrl,
    };
  } catch {
    return defaultSettings;
  }
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>(() => loadSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const data = await apiFetch<{ avatarDataUrl?: string; avatarUrl?: string }>(
        "/api/settings/avatar",
        {
          method: "POST",
          body: formData,
        }
      );

      if (data.avatarDataUrl || data.avatarUrl) {
        const newAvatarUrl = data.avatarDataUrl || data.avatarUrl;
        setSettings((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({ ...loadSettings(), avatarUrl: newAvatarUrl })
        );
      }
      await backendSettingsQuery.refetch();
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
  };

  const initials =
    settings.fullName
      ?.split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  const backendSettingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{
        item: {
          companyName?: string;
          supportEmail?: string;
          timezone?: string;
          notificationsEnabled?: boolean;
          autoLogoutMinutes?: number;
          notifications?: Record<string, boolean>;
          fullName?: string;
          email?: string;
          avatarUrl?: string;
          avatarDataUrl?: string;
        };
      }>("/api/settings");
    },
  });

  useEffect(() => {
    const item = backendSettingsQuery.data?.item;
    if (!item) return;
    setSettings((prev) => ({
      ...prev,
      companyName: typeof item.companyName === "string" ? item.companyName : prev.companyName,
      supportEmail: typeof item.supportEmail === "string" ? item.supportEmail : prev.supportEmail,
      timezone: typeof item.timezone === "string" ? item.timezone : prev.timezone,
      notificationsEnabled:
        typeof item.notificationsEnabled === "boolean" ? item.notificationsEnabled : prev.notificationsEnabled,
      autoLogoutMinutes:
        typeof item.autoLogoutMinutes === "number" ? item.autoLogoutMinutes : prev.autoLogoutMinutes,
      fullName: typeof item.fullName === "string" ? item.fullName : prev.fullName,
      email: typeof item.email === "string" ? item.email : prev.email,
      avatarUrl: typeof item.avatarDataUrl === "string" && item.avatarDataUrl
        ? item.avatarDataUrl
        : typeof item.avatarUrl === "string"
          ? item.avatarUrl
          : prev.avatarUrl,
    }));
  }, [backendSettingsQuery.data]);

  const notifications = backendSettingsQuery.data?.item?.notifications || {};
  const saveChanges = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await apiFetch<{ item: any }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          companyName: settings.companyName,
          supportEmail: settings.supportEmail,
          timezone: settings.timezone,
          notificationsEnabled: settings.notificationsEnabled,
          autoLogoutMinutes: settings.autoLogoutMinutes,
          fullName: settings.fullName,
          email: settings.email,
          avatarUrl: settings.avatarUrl,
        }),
      });
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      await backendSettingsQuery.refetch();
      setSaveMessage("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveMessage("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const setBackendNotification = async (key: string, value: boolean) => {
    await apiFetch<{ item: any }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        notifications: {
          ...notifications,
          [key]: value,
        },
      }),
    });
    await backendSettingsQuery.refetch();
  };

  const onChangePassword = async () => {
    const currentPassword = passwordDraft.currentPassword;
    const newPassword = passwordDraft.newPassword;
    const confirmNewPassword = passwordDraft.confirmNewPassword;

    if (!currentPassword || !newPassword || !confirmNewPassword) return;
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    try {
      setPasswordError(null);
      setPasswordSaving(true);
      await apiFetch<{ ok: true }>("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <AdminLayout>
      {/* Mobile-first container */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">

        {/* Page Header - Responsive */}
        <div className="space-y-1.5 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
            Configure system-wide settings and preferences.
          </p>
        </div>

        {/* Settings Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">

          {/* Profile Card */}
          <Card className="shadow-soft border-0 sm:border">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-5 sm:pb-6 pt-0">
              {/* Profile Picture */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    {settings.avatarUrl ? (
                      <AvatarImage src={settings.avatarUrl} alt={settings.fullName || "Admin"} />
                    ) : (
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
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
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div>
                  <p className="font-medium text-foreground">Profile Picture</p>
                  <p className="text-sm text-muted-foreground">
                    Click the camera icon to upload
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium">Full Name</label>
                <Input
                  value={settings.fullName}
                  onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="shadow-soft border-0 sm:border">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-5 sm:pb-6 pt-0">
              <div className="rounded-md border p-3 sm:p-4 space-y-3">
                <p className="text-sm sm:text-base font-medium">Change Password</p>
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-medium">Current Password</label>
                  <Input
                    type="password"
                    value={passwordDraft.currentPassword}
                    onChange={(e) => setPasswordDraft((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      value={passwordDraft.newPassword}
                      onChange={(e) => setPasswordDraft((p) => ({ ...p, newPassword: e.target.value }))}
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-medium">Confirm New Password</label>
                    <Input
                      type="password"
                      value={passwordDraft.confirmNewPassword}
                      onChange={(e) => setPasswordDraft((p) => ({ ...p, confirmNewPassword: e.target.value }))}
                      className="h-9 sm:h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="rounded-md bg-destructive/10 p-2">
                    <p className="text-xs sm:text-sm text-destructive break-words">{passwordError}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={onChangePassword}
                    disabled={passwordSaving || !passwordDraft.currentPassword || !passwordDraft.newPassword}
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Changes Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {saveMessage}
            </p>
          )}
          <div className="flex gap-3 ml-auto">
            <Button
              variant="outline"
              onClick={() => {
                const saved = loadSettings();
                setSettings(saved);
                setSaveMessage("Changes discarded");
              }}
              disabled={isSaving}
            >
              Reset
            </Button>
            <Button
              onClick={saveChanges}
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Footer Note - Only visible on mobile */}
        <div className="block sm:hidden text-center">
          <p className="text-xs text-muted-foreground">
            Settings are saved automatically in your browser
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}