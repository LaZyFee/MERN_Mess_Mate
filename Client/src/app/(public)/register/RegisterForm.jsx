"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import PasswordStrengthMeter from "@/components/shared/PasswordStrengthMeter";
import { useToast } from "@/components/shared/ToastProvider";
import { authApi } from "@/lib/api/auth";
import styles from "../auth.module.css";

export default function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (form.password.length < 8) e.password = "Min 8 characters";
    if (!/[A-Z]/.test(form.password)) e.password = "Need uppercase letter";
    if (!/[a-z]/.test(form.password)) e.password = "Need lowercase letter";
    if (!/\d/.test(form.password)) e.password = "Need a number";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const body = { username: form.username, email: form.email, password: form.password };
      if (form.phone.trim()) body.phone = form.phone.trim();
      await authApi.register(body);
      showToast({ status: "success", title: "Account created!", description: "Check your email to verify your account." });
      router.push("/login");
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Registration failed";
      // map field errors
      if (err?.data?.errors) {
        const fe = {};
        err.data.errors.forEach(({ field, message }) => { fe[field] = message; });
        setErrors(fe);
      } else {
        showToast({ status: "error", title: "Error", description: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.fieldset}>
        <Input
          label="Username"
          isRequired
          value={form.username}
          onChange={set("username")}
          isInvalid={!!errors.username}
          errorMessage={errors.username}
          autoComplete="username"
          inputMode="text"
        />
        <Input
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
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          isInvalid={!!errors.phone}
          errorMessage={errors.phone}
          autoComplete="tel"
          inputMode="tel"
        />
        <Input
          label="Password"
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
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          isInvalid={!!errors.confirmPassword}
          errorMessage={errors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" isFullWidth isLoading={loading} isDisabled={loading}>
          Create Account
        </Button>
      </div>
    </form>
  );
}
