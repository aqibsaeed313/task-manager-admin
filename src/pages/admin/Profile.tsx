import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { apiFetch } from "@/lib/admin/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type SettingsItem = {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
};

type MeItem = {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
};

export default function Profile() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      return apiFetch<{ item: MeItem }>("/api/auth/me");
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{ item: SettingsItem }>("/api/settings");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: SettingsItem) => {
      return apiFetch<{ item: any }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
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

  const [draft, setDraft] = useState<SettingsItem | null>(null);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data?.item) {
      setDraft(settingsQuery.data.item);
    }
  }, [settingsQuery.data]);

  const onSave = () => {
    if (!draft) return;
    saveMutation.mutate({
      fullName: draft.fullName || "",
      email: draft.email || "",
      phone: draft.phone || "",
      role: draft.role || "",
    });
  };

  const onChangePassword = () => {
    const currentPassword = passwordDraft.currentPassword;
    const newPassword = passwordDraft.newPassword;
    const confirmNewPassword = passwordDraft.confirmNewPassword;

    if (!currentPassword || !newPassword || !confirmNewPassword) return;
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    setPasswordError(null);
    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordDraft({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
        },
        onError: (e) => {
          setPasswordError(e instanceof Error ? e.message : "Failed to change password");
        },
      }
    );
  };

  const me = meQuery.data?.item;
  const roleLabel = String(me?.role || draft?.role || "").trim();

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
        <div className="space-y-1.5 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl">
            Manage your account information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          <Card className="shadow-soft border-0 sm:border">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Account</CardTitle>
                <div className="flex items-center gap-2">
                  {roleLabel ? (
                    <Badge variant="secondary" className="text-xs">
                      {roleLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-5 sm:pb-6 pt-0">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium">Username</label>
                <Input
                  value={String(me?.username || "")}
                  disabled
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium">Full Name</label>
                <Input
                  value={String(draft?.fullName || "")}
                  onChange={(e) => setDraft((p) => ({ ...(p || {}), fullName: e.target.value }))}
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={String(draft?.email || me?.email || "")}
                  onChange={(e) => setDraft((p) => ({ ...(p || {}), email: e.target.value }))}
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium">Phone</label>
                <Input
                  value={String(draft?.phone || "")}
                  onChange={(e) => setDraft((p) => ({ ...(p || {}), phone: e.target.value }))}
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={onSave}
                  disabled={saveMutation.isPending || !draft}
                  className="h-9 sm:h-10 text-sm sm:text-base"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-0 sm:border">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Security</CardTitle>
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
                    disabled={
                      changePasswordMutation.isPending ||
                      !passwordDraft.currentPassword ||
                      !passwordDraft.newPassword ||
                      !passwordDraft.confirmNewPassword
                    }
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
