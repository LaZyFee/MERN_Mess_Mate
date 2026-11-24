"use client";

import React, { useState } from "react";
import { LuUtensils } from "react-icons/lu";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import Alert from "@/components/shared/Alert";
import { useToast } from "@/components/shared/ToastProvider";
import { authApi } from "@/lib/api/auth";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      // Server always returns 200 regardless of whether email exists (privacy)
      await authApi.forgotPassword(email.trim());
    } catch {
      // intentionally swallowed — neutral UX
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <main className={styles.authWrap}>
      <div className={styles.authCard}>
        <div className={styles.authLogo}>
          <LuUtensils size={28} className={["[color:var(--p)]"].filter(Boolean).join(" ")} />
          <span>MealMate</span>
        </div>
        <h1 className={styles.authTitle}>Reset your password</h1>
        <p className={styles.authSub}>Enter your email and we&apos;ll send a reset link.</p>

        {sent ? (
          <Alert status="success">
            If that email is registered, a reset link has been sent. Check your inbox.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-4)]"].filter(Boolean).join(" ")}>
              <Input
                label="Email"
                type="email"
                isRequired
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
              />
              <Button type="submit" isFullWidth isLoading={loading} isDisabled={loading || !email.trim()}>
                Send Reset Link
              </Button>
            </div>
          </form>
        )}

        <p className={styles.authFooter}>
          <a href="/login" className={["[color:var(--p)]", "font-semibold"].filter(Boolean).join(" ")}>← Back to sign in</a>
        </p>
      </div>
    </main>
  );
}
