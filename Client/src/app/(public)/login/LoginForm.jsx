"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/auth";
import { useT } from "@/lib/i18n/LangProvider";
import PasswordInput from "@/components/auth/PasswordInput.jsx";
// 2FA step 
function TwoFAStep({ challengeToken, onBack }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrate = useAuthStore((s) => s.hydrate);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) { setErr(t("auth.login2fa.invalidCode")); return; }
    setLoading(true);
    try {
      const data = await authApi.twoFactorLogin({ challengeToken, code: code.trim() });
      hydrate({ user: data.user, roles: data.user?.roles || [], isAdmin: Boolean(data.user?.isAdmin) });
      router.replace(searchParams.get("next") || "/dashboard");
    } catch (ex) {
      setErr(ex?.data?.message || ex?.message || t("auth.login2fa.invalidCode"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-sm [color:var(--tm)] mb-4">
        {t("auth.login2fa.enterCode")}
      </p>
      <Input
        label={t("auth.login2fa.code")}
        isRequired
        value={code}
        onChange={(e) => { setCode(e.target.value); setErr(""); }}
        isInvalid={!!err}
        errorMessage={err}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
      />
      <div className="flex gap-3 mt-4">
        <Button variant="outline" onClick={onBack} isDisabled={loading} className="flex-1">
          {t("auth.login2fa.back")}
        </Button>
        <Button type="submit" isLoading={loading} isDisabled={loading} className="flex-1">
          {t("auth.login2fa.verify")}
        </Button>
      </div>
    </form>
  );
}

// Main login form
export default function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const hydrate = useAuthStore((s) => s.hydrate);

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [twoFA, setTwoFA] = useState(null); // { challengeToken }

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.password) errs.password = "Password is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await authApi.login({ email: form.email, password: form.password });
      if (data?.twoFactorRequired) {
        setTwoFA({ challengeToken: data.challengeToken });
        return;
      }
      hydrate({ user: data.user, roles: data.user?.roles || [], isAdmin: Boolean(data.user?.isAdmin) });
      router.replace(searchParams.get("next") || "/dashboard");
    } catch (ex) {
      const msg = ex?.data?.message || ex?.message || "Login failed";
      if (ex?.data?.errors) {
        const fe = {};
        ex.data.errors.forEach(({ field, message }) => { fe[field] = message; });
        setErrors(fe);
      } else {
        showToast({ status: "error", title: "Login failed", description: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  if (twoFA) {
    return (
      <TwoFAStep
        challengeToken={twoFA.challengeToken}
        onBack={() => setTwoFA(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-4">
        <Input
          label={t("auth.login.email")}
          type="email"
          isRequired
          value={form.email}
          onChange={set("email")}
          isInvalid={!!errors.email}
          errorMessage={errors.email}
          autoComplete="email"
          inputMode="email"
        />
        <PasswordInput
          size="md"
          label={t("auth.login.password")}
          isRequired
          value={form.password}
          onChange={set("password")}
          isInvalid={!!errors.password}
          errorMessage={errors.password}
          autoComplete="current-password"
        />
        <div className="flex items-center justify-between gap-3 -mt-2">

          <a
            href="/forgot-password"
            className="[font-size:0.8125rem] [color:var(--p)] font-medium"
          >
            {t("auth.login.forgot")}
          </a>
        </div>
        <Button type="submit" variant="primary" isFullWidth isLoading={loading} isDisabled={loading}>
          {t("auth.login.submit")}
        </Button>
        <Button
          as="a"
          href="/api/bff/users/auth/google"
          variant="outline"
          isFullWidth
        >
          {t("auth.login.google")}
        </Button>
      </div>
    </form>
  );
}
