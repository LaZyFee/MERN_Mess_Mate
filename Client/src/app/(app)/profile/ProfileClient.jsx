"use client";

import { useState } from "react";
import { LuSave, LuShieldCheck } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Checkbox from "@/components/shared/Checkbox";
import Input from "@/components/shared/Input";
import PasswordStrengthMeter from "@/components/shared/PasswordStrengthMeter";
import ProfileAvatarUpload from "@/components/shared/ProfileAvatarUpload";
import { useToast } from "@/components/shared/ToastProvider";
import { authApi } from "@/lib/api/auth";
import { notificationsApi } from "@/lib/api/notifications";
import { useAuthStore } from "@/lib/store/authStore";

export default function ProfileClient({ initialProfile, notificationPrefsSlot = null }) {
  const { showToast } = useToast();
  const setUser = useAuthStore((s) => s.setUser);

  const [profile, setProfile] = useState(initialProfile || {});
  const [username, setUsername] = useState(profile.username || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.profilePic || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [consent, setConsent] = useState(Boolean(profile.whatsappConsent));
  const [savingConsent, setSavingConsent] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await authApi.updateProfile({
        username: username.trim(),
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
      });
      const next = res?.user || { ...profile, username, phone, whatsapp };
      setProfile(next);
      setUser?.(next);
      showToast({ status: "success", title: "Profile updated" });
    } catch (ex) {
      showToast({ status: "error", title: "Could not save", description: ex?.data?.msg || ex?.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      const res = await authApi.uploadProfilePic(avatarFile);
      const pic = res?.profilePic || res?.user?.profilePic;
      setAvatarFile(null);
      setAvatarPreview(pic || avatarPreview);
      showToast({ status: "success", title: "Photo updated" });
    } catch (ex) {
      showToast({ status: "error", title: "Upload failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const changePassword = async () => {
    const strong = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /\d/.test(newPassword);
    if (!currentPassword || !strong) {
      showToast({ status: "warning", title: "Check the password rules", description: "8+ chars with upper, lower and a digit." });
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      showToast({ status: "success", title: "Password changed" });
    } catch (ex) {
      showToast({ status: "error", title: "Could not change password", description: ex?.data?.msg || ex?.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleConsent = async () => {
    const next = !consent;
    setSavingConsent(true);
    try {
      await notificationsApi.setWhatsappConsent(next);
      setConsent(next);
      showToast({ status: "success", title: next ? "WhatsApp notifications on" : "WhatsApp notifications off" });
    } catch (ex) {
      showToast({ status: "error", title: "Could not update consent", description: ex?.data?.msg || ex?.message });
    } finally {
      setSavingConsent(false);
    }
  };

  return (
    <div className="space-y-4">
      {notificationPrefsSlot}
      <Card padding="md" className="min-w-0">
        <h2 className="mb-3 text-sm font-bold text-(--tp)">Photo</h2>
        <ProfileAvatarUpload
          avatarPreview={avatarPreview}
          avatarFile={avatarFile}
          name={username || "User"}
          onFileChange={(file) => setAvatarFile(file || null)}
          onRemove={() => setAvatarFile(null)}
        />
        {avatarFile && (
          <Button className="mt-2" size="md" isLoading={uploadingAvatar} isDisabled={uploadingAvatar || !avatarFile} onClick={uploadAvatar}>
            Upload photo
          </Button>
        )}
      </Card>

      <Card padding="md" className="min-w-0">
        <h2 className="mb-3 text-sm font-bold text-(--tp)">Account</h2>
        <div className="space-y-3">
          <Input size="lg" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input size="lg" label="Email" value={profile.email || ""} isReadOnly helperText="Email cannot be changed here." />
          <Input size="lg" type="tel" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            size="lg"
            type="tel"
            label="WhatsApp number"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+8801XXXXXXXXX"
          />
          <Button size="lg" isFullWidth leftIcon={<LuSave size={15} />} isLoading={savingProfile} isDisabled={savingProfile} onClick={saveProfile}>
            Save changes
          </Button>
        </div>
      </Card>

      <Card padding="md" className="min-w-0">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-(--tp)">
          <LuShieldCheck size={16} className="text-(--p)" /> WhatsApp consent
        </h2>
        <p className="mb-2 text-xs text-(--tm)">
          Allow MealMate to send statements and reminders to your WhatsApp number.
        </p>
        <Checkbox
          label="I agree to receive WhatsApp notifications"
          isChecked={consent}
          isDisabled={savingConsent}
          onChange={toggleConsent}
        />
      </Card>

      <Card padding="md" className="min-w-0">
        <h2 className="mb-3 text-sm font-bold text-(--tp)">Change password</h2>
        <div className="space-y-3">
          <Input
            size="lg"
            type="password"
            label="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            size="lg"
            type="password"
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          {newPassword && <PasswordStrengthMeter password={newPassword} />}
          <Button size="lg" isFullWidth isLoading={savingPassword} isDisabled={savingPassword} onClick={changePassword}>
            Update password
          </Button>
        </div>
      </Card>
    </div>
  );
}
