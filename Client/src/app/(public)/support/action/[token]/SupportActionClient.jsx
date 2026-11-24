"use client";

/**
 * T10.3 — Email action landing page. Posts the one-time token and shows a
 * neutral result (the server never reveals whether the token was valid).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { LuCircleCheck, LuCircleAlert, LuLoaderCircle } from "react-icons/lu";
import Card from "@/components/shared/Card";
import { supportApi } from "@/lib/api/platform";

export default function SupportActionClient({ token }) {
  const [state, setState] = useState({ status: "loading", message: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await supportApi.publicAction(token);
        if (!cancelled) setState({ status: "done", message: data?.msg || "Action completed. Thank you." });
      } catch (ex) {
        if (!cancelled) {
          setState({
            status: "error",
            message: ex?.data?.msg || "This action link is invalid or has expired.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Card padding="lg" variant="outlined" className="text-center">
        {state.status === "loading" ? (
          <>
            <LuLoaderCircle size={26} className="mx-auto mb-3 animate-spin text-(--p)" />
            <p className="text-sm font-semibold text-(--tp)">Processing your action…</p>
          </>
        ) : state.status === "done" ? (
          <>
            <LuCircleCheck size={30} className="mx-auto mb-3 text-(--success)" />
            <p className="text-sm font-semibold text-(--tp)">{state.message}</p>
          </>
        ) : (
          <>
            <LuCircleAlert size={30} className="mx-auto mb-3 text-(--warning)" />
            <p className="text-sm font-semibold text-(--tp)">{state.message}</p>
          </>
        )}
        <Link href="/support" className="mt-4 inline-flex min-h-11 items-center text-xs font-bold text-(--p) no-underline">
          Go to support
        </Link>
      </Card>
    </div>
  );
}
