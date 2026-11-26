"use client";

/**
 * T10.4 — Public appeal form for suspended accounts. The server always
 * answers neutrally so the form cannot be used to probe accounts.
 */
import { useState } from "react";
import Link from "next/link";
import { LuShieldAlert } from "react-icons/lu";
import Alert from "@/components/shared/Alert";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Textarea from "@/components/shared/Textarea";
import TurnstileWidget, { hasTurnstile } from "@/components/shared/TurnstileWidget";
import { supportApi } from "@/lib/api/platform";

export default function AppealClient() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [state, setState] = useState({ status: "idle", note: "" });

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: "sending", note: "" });
    try {
      const data = await supportApi.appeal({
        email: email.trim(),
        message: message.trim(),
        captchaToken: captchaToken.trim() || undefined,
      });
      setState({
        status: "done",
        note: data?.msg || "If the address matches a suspended account, we will review the appeal.",
      });
      setMessage("");
    } catch (ex) {
      setState({
        status: "done",
        note: ex?.data?.msg || "If the address matches a suspended account, we will review the appeal.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="mb-5 text-center">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-(--warning-bg) text-(--warning)">
          <LuShieldAlert size={22} />
        </span>
        <h1 className="text-lg font-extrabold text-(--tp)">Appeal a suspension</h1>
        <p className="mt-1 text-xs text-(--tm)">
          Tell us what happened. Appeals are reviewed by the MealMate team and you will hear back by email.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-[var(--r-lg)] border border-(--bd) bg-(--bgs) p-4 shadow-[var(--shadow-md)]">
        <Input
          size="lg"
          type="email"
          label="Account email"
          isRequired
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
        <Textarea
          label="Your appeal"
          rows={5}
          isRequired
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          helperText="At least 10 characters"
        />
        <TurnstileWidget onToken={setCaptchaToken} isRequired={hasTurnstile()} />
        {state.note && (
          <Alert status="info" title="Appeal received">
            {state.note}
          </Alert>
        )}
        <Button
          type="submit"
          size="lg"
          isFullWidth
          isLoading={state.status === "sending"}
          isDisabled={state.status === "sending" || email.trim().length < 5 || message.trim().length < 10 || (hasTurnstile() && !captchaToken)}
        >
          Submit appeal
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-(--tm)">
        Not suspended? <Link href="/login" className="font-semibold text-(--p) no-underline">Back to sign in</Link>
      </p>
    </div>
  );
}
