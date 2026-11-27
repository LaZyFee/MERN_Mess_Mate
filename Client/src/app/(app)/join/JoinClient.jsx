"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuLogIn } from "react-icons/lu";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import Alert from "@/components/shared/Alert";
import { groupsApi } from "@/lib/api/groups";

function JoinForm({ initialCode }) {
  const [code, setCode] = useState(initialCode);
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) { setError("Enter an invite code"); return; }
    if (!groupId.trim()) { setError("Enter a group ID"); return; }
    setError("");
    setLoading(true);
    try {
      await groupsApi.joinByCode({ code: code.trim(), groupId: groupId.trim() });
      setPending(true);
    } catch (ex) {
      const msg = ex?.data?.message || ex?.message || "Failed to join";
      if (ex?.status === 429) {
        setError("Too many attempts. Please wait before trying again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <Alert status="success">
        Your join request was submitted! An admin will approve it soon. You can{" "}
        <Link href="/" className="[color:var(--p)] font-semibold">go home</Link> while you wait.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-4">
        {error && <Alert status="error">{error}</Alert>}
        <Input
          label="Invite Code"
          isRequired
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
          placeholder="MM-XXXXXX"
          helperText="Case-insensitive 6-character code"
          autoComplete="off"
        />
        <Input
          label="Group ID"
          isRequired
          value={groupId}
          onChange={(e) => { setGroupId(e.target.value.trim()); setError(""); }}
          placeholder="Group identifier"
          helperText="Ask your group admin for the Group ID"
          autoComplete="off"
        />
        <Button type="submit" variant="primary" isFullWidth isLoading={loading} isDisabled={loading} leftIcon={<LuLogIn size={16} />}>
          Join Group
        </Button>
      </div>
    </form>
  );
}

export default function JoinClient({ initialCode = "" }) {
  const router = useRouter();
  return (
    <main className="[min-height:100dvh] [background:var(--bg)] [padding:var(--space-6)_var(--space-4)] flex flex-col items-center justify-center">
      <div className="w-full [max-width:480px]">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 [color:var(--tm)] text-sm mb-5 bg-none border-0 cursor-pointer p-0"
        >
          <LuArrowLeft size={16} /> Back
        </button>
        <div className="[background:var(--bgs)] [border:1px_solid_var(--bd)] [border-radius:var(--r-xl)] [box-shadow:var(--shadow-lg)] p-8">
          <h1 className="[font-size:1.375rem] font-extrabold [color:var(--tp)] mb-2">
            Join a Group
          </h1>
          <p className="[color:var(--tm)] text-sm mb-6">
            Enter the invite code and Group ID shared by your admin.
          </p>
          <JoinForm initialCode={initialCode} />
        </div>
      </div>
    </main>
  );
}
