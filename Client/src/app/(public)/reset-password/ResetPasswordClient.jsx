"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/shared/Button";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrengthMeter from "@/components/shared/PasswordStrengthMeter";
import { useToast } from "@/components/shared/ToastProvider";
import { authApi } from "@/lib/api/auth";

function ResetForm({ token }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (form.password.length < 8) errs.password = "Use at least 8 characters";
    else if (!/[A-Z]/.test(form.password)) errs.password = "Add an uppercase letter";
    else if (!/[a-z]/.test(form.password)) errs.password = "Add a lowercase letter";
    else if (!/\d/.test(form.password)) errs.password = "Add a number";
    if (form.password !== form.confirm) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (ex) {
      showToast({
        status: "error",
        title: "Couldn't reset your password",
        description: ex?.data?.message || "The link may have expired. Request a new one.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Toast once per state change — never during render (showToast sets state).
  useEffect(() => {
    if (!token) {
      showToast({
        status: "error",
        title: "This link isn't valid",
        description: "It may have expired or already been used.",
        duration: 8000,
      });
    } else if (done) {
      showToast({
        status: "success",
        title: "Password updated",
        description: "Taking you to sign in...",
        duration: 2500,
      });
    }
  }, [token, done, showToast]);

  if (!token) return null;

  if (done) return null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <PasswordInput
          label="New password"
          isRequired
          value={form.password}
          onChange={set("password")}
          isInvalid={!!errors.password}
          errorMessage={errors.password}
          autoComplete="new-password"
        />
        <PasswordStrengthMeter password={form.password} compact />
      </div>
      <PasswordInput
        label="Confirm password"
        isRequired
        value={form.confirm}
        onChange={set("confirm")}
        isInvalid={!!errors.confirm}
        errorMessage={errors.confirm}
        autoComplete="new-password"
      />
      <Button type="submit" size="lg" isFullWidth isLoading={loading} isDisabled={loading}>
        Save new password
      </Button>
    </form>
  );
}

export default function ResetPasswordClient({ token = "" }) {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you don't use anywhere else."
      footer={
        <Link href="/login" className="font-semibold text-(--p) no-underline hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetForm token={token} />
    </AuthShell>
  );
}