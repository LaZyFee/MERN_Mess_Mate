"use client";

import Button from "@/components/shared/Button";

export default function Error({ error, reset }) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 bg-[var(--bg)]">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-[var(--tp)]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--tm)]">
          {error?.message || "An unexpected error occurred."}
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </main>
  );
}