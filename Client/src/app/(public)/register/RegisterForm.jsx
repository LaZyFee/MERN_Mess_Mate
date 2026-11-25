"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrengthMeter from "@/components/shared/PasswordStrengthMeter";
import { useToast } from "@/components/shared/ToastProvider";
import { authApi } from "@/lib/api/auth";

function validate(form) {
  const e = {};
  if (!form.username.trim()) e.username = "Choose a username";
  if (!form.email.trim()) e.email = "Enter your email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "That email doesn't look right";
  if (form.password.length < 8) e.password = "Use at least 8 characters";
  else if (!/[A-Z]/.test(form.password)) e.password = "Add an uppercase letter";
  else if (!/[a-z]/.test(form.password)) e.password = "Add a lowercase letter";
  else if (!/\d/.test(form.password)) e.password = "Add a number";
  if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
  return e;
}

export default function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const body = { username: form.username.trim(), email: form.email.trim(), password: form.password };
      if (form.phone.trim()) body.phone = form.phone.trim();
      await authApi.register(body);
      router.push("/login?registered=1");
    } catch (err) {
      if (err?.data?.errors) {
        const fe = {};
        err.data.errors.forEach(({ field, message }) => {
          fe[field] = message;
        });
        setErrors(fe);
      } else {
        showToast({
          status: "error",
          title: "Couldn't create your account",
          description: err?.data?.message || err?.message || "Try again in a moment.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        size="lg"
        label="Username"
        isRequired
        value={form.username}
        onChange={set("username")}
        isInvalid={!!errors.username}
        errorMessage={errors.username}
        autoComplete="username"
      />
      <Input
        size="lg"
        label="Email"
        type="email"
        isRequired
        value={form.email}
        onChange={set("email")}
        isInvalid={!!errors.email}
        errorMessage={errors.email}
        autoComplete="email"
        inputMode="email"
      />
      <Input
        size="lg"
        label="Phone (optional)"
        type="tel"
        value={form.phone}
        onChange={set("phone")}
        isInvalid={!!errors.phone}
        errorMessage={errors.phone}
        autoComplete="tel"
        inputMode="tel"
        helperText="Used for WhatsApp reminders."
      />
      <div>
        <PasswordInput
          label="Password"
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
        value={form.confirmPassword}
        onChange={set("confirmPassword")}
        isInvalid={!!errors.confirmPassword}
        errorMessage={errors.confirmPassword}
        autoComplete="new-password"
      />
      <Button type="submit" size="lg" variant="primary" isFullWidth isLoading={loading} isDisabled={loading}>
        Create account
      </Button>
    </form>
  );
}