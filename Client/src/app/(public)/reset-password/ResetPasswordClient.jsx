"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuUtensils } from "react-icons/lu";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import PasswordStrengthMeter from "@/components/shared/PasswordStrengthMeter";
import Alert from "@/components/shared/Alert";
import { useToast } from "@/components/shared/ToastProvider";
import { authApi } from "@/lib/api/auth";
import styles from "../auth.module.css";

function ResetForm({ token }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (form.password.length < 8) errs.password = "Min 8 characters";
    if (!/[A-Z]/.test(form.password)) errs.password = "Need uppercase letter";
    if (!/[a-z]/.test(form.password)) errs.password = "Need lowercase letter";
    if (!/\d/.test(form.password)) errs.password = "Need a number";
    if (form.password !== form.confirm) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!token) { showToast({ status: "error", title: "Invalid link" }); return; }
    setErrors({});
    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.data?.message || "Reset failed" });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <Alert status="success">Password updated! Redirecting to sign in…</Alert>;
  }

  if (!token) {
    return <Alert status="error">Invalid or expired reset link. Please request a new one.</Alert>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-4)]"].filter(Boolean).join(" ")}>
        <Input
          label="New Password"
          type="password"
          isRequired
          value={form.password}
          onChange={set("password")}
          isInvalid={!!errors.password}
          errorMessage={errors.password}
          autoComplete="new-password"
        />
        <PasswordStrengthMeter password={form.password} />
        <Input
          label="Confirm Password"
          type="password"
          isRequired
          value={form.confirm}
          onChange={set("confirm")}
          isInvalid={!!errors.confirm}
          errorMessage={errors.confirm}
          autoComplete="new-password"
        />
        <Button type="submit" isFullWidth isLoading={loading} isDisabled={loading}>
          Set New Password
        </Button>
      </div>
    </form>
  );
}

export default function ResetPasswordClient({ token = "" }) {
  return (
    <main className={styles.authWrap}>
      <div className={styles.authCard}>
        <div className={styles.authLogo}>
          <LuUtensils size={28} className={["[color:var(--p)]"].filter(Boolean).join(" ")} />
          <span>MealMate</span>
        </div>
        <h1 className={styles.authTitle}>Set new password</h1>
        <p className={styles.authSub}>Choose a strong password for your account.</p>
        <ResetForm token={token} />
        <p className={styles.authFooter}>
          <a href="/login" className={["[color:var(--p)]", "font-semibold"].filter(Boolean).join(" ")}>← Back to sign in</a>
        </p>
      </div>
    </main>
  );
}
