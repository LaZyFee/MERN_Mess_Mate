"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuLogIn } from "react-icons/lu";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import Alert from "@/components/shared/Alert";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";

function JoinForm({ initialCode }) {
  const router = useRouter();
  const { showToast } = useToast();

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
      showToast({ status: "success", title: "Join request sent!", description: "Waiting for approval." });
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
        <a href="/" className={["[color:var(--p)]", "font-semibold"].filter(Boolean).join(" ")}>go home</a> while you wait.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-4)]"].filter(Boolean).join(" ")}>
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
        <Button type="submit" isFullWidth isLoading={loading} isDisabled={loading} leftIcon={<LuLogIn size={16} />}>
          Join Group
        </Button>
      </div>
    </form>
  );
}

export default function JoinClient({ initialCode = "" }) {
  const router = useRouter();
  return (
    <main className={["[min-height:100dvh]", "[background:var(--bg)]", "[padding:var(--space-6)_var(--space-4)]", "[display:flex]", "[flex-direction:column]", "[align-items:center]", "[justify-content:center]"].filter(Boolean).join(" ")}>
      <div className={["[width:100%]", "[max-width:480px]"].filter(Boolean).join(" ")}>
        <button
          onClick={() => router.back()}
          className={["[display:flex]", "[align-items:center]", "[gap:6px]", "[color:var(--tm)]", "[font-size:0.875rem]", "[margin-bottom:var(--space-5)]", "[background:none]", "[border:none]", "[cursor:pointer]", "[padding:0px]"].filter(Boolean).join(" ")}
        >
          <LuArrowLeft size={16} /> Back
        </button>
        <div className={["[background:var(--bgs)]", "[border:1px_solid_var(--bd)]", "[border-radius:var(--r-xl)]", "[box-shadow:var(--shadow-lg)]", "[padding:var(--space-8)]"].filter(Boolean).join(" ")}>
          <h1 className={["[font-size:1.375rem]", "font-extrabold", "[color:var(--tp)]", "[margin-bottom:var(--space-2)]"].filter(Boolean).join(" ")}>
            Join a Group
          </h1>
          <p className={["[color:var(--tm)]", "[font-size:0.875rem]", "[margin-bottom:var(--space-6)]"].filter(Boolean).join(" ")}>
            Enter the invite code and Group ID shared by your admin.
          </p>
          <JoinForm initialCode={initialCode} />
        </div>
      </div>
    </main>
  );
}
