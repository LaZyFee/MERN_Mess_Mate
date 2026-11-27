"use client";

import { useState } from "react";
import Link from "next/link";
import { LuSave, LuShieldCheck, LuShieldOff, LuMonitor, LuLifeBuoy, LuArrowUpRight } from "react-icons/lu";
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
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState([]);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

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

  const setupTwoFactor = async () => {
    setTwoFactorBusy(true);
    try {
      const data = await authApi.setupTwoFactor();
      setTwoFactorSetup({ secret: data?.secret, otpauthUrl: data?.otpauthUrl });
      setTwoFactorRecoveryCodes([]);
    } catch (ex) {
      showToast({ status: "error", title: "Could not start 2FA setup", description: ex?.data?.msg || ex?.message });
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const verifyTwoFactor = async () => {
    if (!/^\d{6}$/.test(twoFactorCode)) {
      showToast({ status: "warning", title: "Enter the 6-digit authenticator code" });
      return;
    }
    setTwoFactorBusy(true);
    try {
      const data = await authApi.verifyTwoFactor(twoFactorCode);
      setTwoFactorRecoveryCodes(data?.recoveryCodes || []);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      showToast({ status: "success", title: "2FA enabled" });
    } catch (ex) {
      showToast({ status: "error", title: "Could not verify 2FA", description: ex?.data?.msg || ex?.message });
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!disablePassword || !disableCode.trim()) {
      showToast({ status: "warning", title: "Password and 2FA code are required" });
      return;
    }
    setTwoFactorBusy(true);
    try {
      await authApi.disableTwoFactor({ password: disablePassword, code: disableCode.trim() });
      setDisablePassword("");
      setDisableCode("");
      showToast({ status: "success", title: "2FA disabled" });
    } catch (ex) {
      showToast({ status: "error", title: "Could not disable 2FA", description: ex?.data?.msg || ex?.message });
    } finally {
      setTwoFactorBusy(false);
    }
  };

  return (
    <div>
      <div className="min-w-0 space-y-4">

        <Card variant="outlined" padding="lg" className="min-w-0 rounded-2xl">
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

        <Card variant="outlined" padding="lg" className="min-w-0 rounded-2xl">
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
            <Button variant="primary" size="lg" isFullWidth leftIcon={<LuSave size={15} />} isLoading={savingProfile} isDisabled={savingProfile} onClick={saveProfile}>
              Save changes
            </Button>
          </div>
        </Card>

        <Card variant="outlined" padding="lg" className="min-w-0 rounded-2xl">
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

        <Card variant="outlined" padding="lg" className="min-w-0 rounded-2xl">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-(--tp)">
            <LuShieldCheck size={16} className="text-(--p)" /> Two-factor authentication
          </h2>
          {twoFactorSetup ? (
            <div className="space-y-3">
              <p className="text-xs text-(--tm)">Add this secret to your authenticator app, then enter the 6-digit code.</p>
              <div className="rounded-lg border border-(--bd) bg-(--bgm) px-3 py-2 font-mono text-sm text-(--tp)">
                {twoFactorSetup.secret}
              </div>
              <Input
                size="lg"
                label="Authenticator code"
                value={twoFactorCode}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                onChange={(event) => setTwoFactorCode(event.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setTwoFactorSetup(null)} isDisabled={twoFactorBusy}>Cancel</Button>
                <Button className="flex-1" isLoading={twoFactorBusy} isDisabled={twoFactorBusy} onClick={verifyTwoFactor}>Enable 2FA</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {twoFactorRecoveryCodes.length > 0 && (
                <div className="rounded-lg border border-(--warning) bg-(--warning-bg) p-3">
                  <p className="mb-2 text-xs font-bold text-(--warning)">Save these recovery codes now</p>
                  <code className="block whitespace-pre-wrap text-xs text-(--tp)">
                    {twoFactorRecoveryCodes.join("\n")}
                  </code>
                </div>
              )}
              <Button variant="primary" size="md" leftIcon={<LuShieldCheck size={14} />} isLoading={twoFactorBusy} onClick={setupTwoFactor}>
                Set up authenticator app
              </Button>
              <div className="grid gap-2 border-t border-(--bd) pt-3 sm:grid-cols-2">
                <Input
                  size="lg"
                  type="password"
                  label="Password"
                  value={disablePassword}
                  onChange={(event) => setDisablePassword(event.target.value)}
                  autoComplete="current-password"
                />
                <Input
                  size="lg"
                  label="Authenticator code"
                  value={disableCode}
                  inputMode="text"
                  maxLength={8}
                  onChange={(event) => setDisableCode(event.target.value)}
                />
              </div>
              <Button size="md" variant="danger" leftIcon={<LuShieldOff size={14} />} isLoading={twoFactorBusy} onClick={disableTwoFactor}>
                Disable 2FA
              </Button>
            </div>
          )}
        </Card>

        <Card variant="outlined" padding="lg" className="min-w-0 rounded-2xl">
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
        <Card variant="outlined" padding="md" className="flex flex-col gap-3 bg-(--pale) sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-(--tp)">Account security</h2><p className="mt-1 text-sm text-(--tm)">Review active devices and sign out sessions you no longer use.</p></div>
          <Button as={Link} href="/profile/sessions" variant="outline" size="md" leftIcon={<LuMonitor size={16} />} rightIcon={<LuArrowUpRight size={15} />} className="shrink-0 mt-3">Device sessions</Button>
        </Card>
        {notificationPrefsSlot}
      </div>
      <div className="space-y-4 py-10">
        <Card variant="outlined" padding="lg" className="rounded-2xl">
          <span className="grid size-10 place-items-center rounded-xl bg-(--pale) text-(--p)"><LuShieldCheck size={20} /></span>
          <h2 className="mt-4 font-bold text-(--tp)">Keep your account secure</h2>
          <p className="mt-2 text-sm leading-relaxed text-(--tm)">Use a unique password, review device sessions and enable two-factor authentication.</p>
        </Card>
        <Card variant="outlined" padding="lg" className="rounded-2xl">
          <span className="grid size-10 place-items-center rounded-xl bg-(--pale) text-(--p)"><LuLifeBuoy size={20} /></span>
          <h2 className="mt-4 font-bold text-(--tp)">Need a hand?</h2>
          <p className="mt-2 text-sm leading-relaxed text-(--tm)">Contact the support team about your account or group.</p>
          <Button as={Link} href="/support" variant="outline" size="md" isFullWidth className="mt-4">Open support</Button>
        </Card>
      </div>
    </div>
  );
}
