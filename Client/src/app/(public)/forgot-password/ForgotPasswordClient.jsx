"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import { authApi } from "@/lib/api/auth";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      // The server always answers 200 so this form can't be used to probe accounts.
      await authApi.forgotPassword(email.trim());
    } catch {
      // swallowed on purpose — neutral response
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={
        <Link href="/login" className="font-semibold text-(--p) no-underline hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-(--ts)">
          If that email is registered, a reset link is on its way. It can take a few minutes.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            size="lg"
            label="Email"
            type="email"
            isRequired
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />
          <Button type="submit" size="lg" isFullWidth isLoading={loading} isDisabled={loading || !email.trim()}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}