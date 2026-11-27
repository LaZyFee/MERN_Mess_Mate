"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LuArrowRight, LuBookOpen, LuCircleAlert, LuRefreshCw, LuUtensils } from "react-icons/lu";
import { useT } from "@/lib/i18n/LangProvider";

export default function Error({ error, reset }) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative isolate grid min-h-[100dvh] place-items-center overflow-hidden bg-(--bg) px-4 py-10 text-(--tp) sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[55vh] bg-gradient-to-b from-(--pale) to-transparent" />
      <div className="w-full max-w-lg text-center">
        <Link href="/" className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-(--bd) bg-(--bgs) px-4 font-bold text-(--tp) no-underline shadow-sm">
          <span className="grid size-7 place-items-center rounded-lg bg-(--p) text-(--bgs)"><LuUtensils size={15} /></span>
          MealMate
        </Link>

        <div className="mx-auto mt-10 grid size-20 place-items-center rounded-[1.75rem] border border-(--danger)/20 bg-(--danger-bg) text-(--danger) sm:size-24">
          <LuCircleAlert size={38} strokeWidth={1.6} aria-hidden="true" />
        </div>
        <h1 className="mt-8 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("shell.errorTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-(--ts)">
          {t("shell.errorBody")}
        </p>
        {error?.message && (
          <details className="mx-auto mt-6 max-w-lg rounded-xl border border-(--bd) bg-(--bgs) text-left">
            <summary className="flex min-h-12 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold text-(--ts) hover:bg-(--bgm)">
              Error details
            </summary>
            <pre className="max-h-48 overflow-auto border-t border-(--bd) px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-(--tm)">
              {error.message}
            </pre>
          </details>
        )}

        <div className="mt-8 grid gap-3 sm:flex sm:justify-center">
          <button type="button" onClick={() => reset()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-(--p) px-6 font-semibold text-(--bgs) transition-colors hover:bg-(--p3)">
            <LuRefreshCw size={17} />{t("shell.retry")}
          </button>
          <Link href="/guide" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-(--bd) bg-(--bgs) px-6 font-semibold text-(--tp) no-underline transition-colors hover:bg-(--bgm)">
            <LuBookOpen size={17} />{t("shell.guide")}<LuArrowRight size={15} />
          </Link>
        </div>
      </div>
    </main>
  );
}
