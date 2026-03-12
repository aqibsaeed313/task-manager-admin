import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/manger/ui/button";
import { Input } from "@/components/manger/ui/input";
import { User, Shield, Save, Camera } from "lucide-react";
import { apiFetch } from "@/lib/manger/api";
import { toast } from "@/components/manger/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAuthState } from "@/lib/auth";
import Cropper from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/manger/ui/dialog";

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

  const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

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

      return apiFetch<{ avatarDataUrl?: string; avatarUrl?: string }>("/api/settings/avatar", {
        method: "POST",
        body: formData,
      });
    },
  });

  const [draft, setDraft] = useState<any>(null);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [avatarUploadMessage, setAvatarUploadMessage] = useState<string>("");
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCropOpen, setIsCropOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string>("");
  const [pendingFileName, setPendingFileName] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    // Only initialize draft if it's null and we have data
    if (!draft && settingsQuery.data?.item) {
      const item = settingsQuery.data.item;
      setDraft({
        ...item,
        avatarUrl: item.avatarDataUrl || item.avatarUrl || "",
      });
    }
  }, [settingsQuery.data, draft]);

  const onSave = () => {
    if (!draft) return;

    const payload = {
      ...draft,
      avatarDataUrl: draft.avatarUrl || "",
      avatarUrl: "",
    };

    saveMutation.mutate(payload, {
      onSuccess: (res) => {
        const item = (res as any)?.item as SettingsItem | undefined;
        if (item) {
          setDraft({
            ...item,
            avatarUrl: item.avatarDataUrl || item.avatarUrl || "",
          });
        }
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

  const onCropComplete = (_croppedArea: any, croppedAreaPixelsValue: any) => {
    setCroppedAreaPixels(croppedAreaPixelsValue);
  };

  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedBlob = async (imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create canvas context");

    // Limit max dimensions to 512x512 for avatars to keep file size small
    const maxSize = 512;
    let targetWidth = Math.floor(pixelCrop.width);
    let targetHeight = Math.floor(pixelCrop.height);
    
    if (targetWidth > maxSize || targetHeight > maxSize) {
      const ratio = Math.min(maxSize / targetWidth, maxSize / targetHeight);
      targetWidth = Math.floor(targetWidth * ratio);
      targetHeight = Math.floor(targetHeight * ratio);
    }

    canvas.width = Math.max(1, targetWidth);
    canvas.height = Math.max(1, targetHeight);

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // Use JPEG with 0.8 quality for smaller file size (PNG is lossless and too large)
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) reject(new Error("Failed to export cropped image"));
          else resolve(b);
        },
        "image/jpeg",
        0.8,
      );
    });

    return blob;
  };

  const uploadCroppedAvatar = async () => {
    if (!pendingImageSrc || !croppedAreaPixels) {
      toast({ title: "Crop required", description: "Please adjust the crop before saving." });
      return;
    }

    try {
      setAvatarUploadStatus("uploading");
      setAvatarUploadMessage("Uploading image...");
      toast({ title: "Uploading", description: "Uploading profile picture..." });

      const blob = await getCroppedBlob(pendingImageSrc, croppedAreaPixels);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

      avatarUploadMutation.mutate(file, {
        onSuccess: (data) => {
          const newAvatarUrl = data.avatarDataUrl || data.avatarUrl;
          void queryClient.invalidateQueries({ queryKey: ["settings"] });
          setAvatarUploadStatus("success");
          setAvatarUploadMessage("Image uploaded successfully.");
          toast({ title: "Uploaded", description: "Profile picture updated successfully." });
          if (newAvatarUrl) {
            setDraft((p: any) => ({ ...p, avatarUrl: newAvatarUrl }));
          }
          setIsCropOpen(false);
          setPendingImageSrc("");
          setPendingFileName("");
          setZoom(1);
          setCrop({ x: 0, y: 0 });
          setCroppedAreaPixels(null);
        },
        onError: (err) => {
          setAvatarUploadStatus("error");
          setAvatarUploadMessage(err instanceof Error ? err.message : "Failed to upload image");
          toast({
            title: "Upload failed",
            description: err instanceof Error ? err.message : "Failed to upload image",
          });
          // Close modal on error
          setIsCropOpen(false);
          setPendingImageSrc("");
          setPendingFileName("");
          setZoom(1);
          setCrop({ x: 0, y: 0 });
          setCroppedAreaPixels(null);
        },
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to crop image";
      setAvatarUploadStatus("error");
      setAvatarUploadMessage(msg);
      toast({ title: "Crop failed", description: msg });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarUploadStatus("error");
      setAvatarUploadMessage("Image is too large. Maximum allowed size is 10MB.");
      toast({ title: "File too large", description: "Please select an image up to 10MB." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      setPendingImageSrc(result);
      setPendingFileName(file.name);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
    return;
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

        <Dialog open={isCropOpen} onOpenChange={setIsCropOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Crop profile picture</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative w-full h-72 bg-muted rounded-lg overflow-hidden">
                {pendingImageSrc && (
                  <Cropper
                    image={pendingImageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Zoom</span>
                  <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setIsCropOpen(false);
                  setPendingImageSrc("");
                  setPendingFileName("");
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                  setCroppedAreaPixels(null);
                }}
                disabled={avatarUploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={uploadCroppedAvatar}
                disabled={avatarUploadMutation.isPending}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile Picture */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-border">
              {draft?.avatarUrl ? (
                <AvatarImage src={draft.avatarUrl} alt={draft?.fullName || "User"} className="object-cover" />
              ) : (
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <button
              onClick={handleAvatarClick}
              disabled={avatarUploadMutation.isPending || isCropOpen}
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
            <p className="text-xs text-muted-foreground">
              Max size: 10MB (JPEG, PNG, GIF)
            </p>
            {avatarUploadStatus !== "idle" && (
              <p
                className={
                  avatarUploadStatus === "error"
                    ? "text-sm text-destructive mt-1"
                    : avatarUploadStatus === "success"
                    ? "text-sm text-success mt-1"
                    : "text-sm text-muted-foreground mt-1"
                }
              >
                {avatarUploadMessage}
              </p>
            )}
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
