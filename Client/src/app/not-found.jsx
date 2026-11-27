"use client";

import Link from "next/link";
import { LuArrowLeft, LuBookOpen, LuHouse, LuUtensils } from "react-icons/lu";
import { useT } from "@/lib/i18n/LangProvider";

export default function NotFound() {
  const t = useT();

  return (
    <main className="relative isolate grid min-h-[100dvh] place-items-center overflow-hidden bg-(--bg) px-4 py-10 text-(--tp) sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[55vh] bg-gradient-to-b from-(--pale) to-transparent" />
      <div className="w-full max-w-xl text-center">
        <Link href="/" className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-(--bd) bg-(--bgs) px-4 font-bold text-(--tp) no-underline shadow-sm">
          <span className="grid size-7 place-items-center rounded-lg bg-(--p) text-(--bgs)"><LuUtensils size={15} /></span>
          MealMate
        </Link>

        <div className="mx-auto mt-10 grid size-24 place-items-center rounded-[2rem] border border-(--bd) bg-(--bgs) text-(--p) shadow-lg shadow-(--p)/5 sm:size-28">
          <LuBookOpen size={40} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-(--p)">404</p>
        <h1 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
          {t("shell.notFoundTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-(--ts)">
          {t("shell.notFoundBody")}
        </p>

        <div className="mt-8 grid gap-3 sm:flex sm:justify-center">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-(--p) px-6 font-semibold text-(--bgs) no-underline transition-colors hover:bg-(--p3)">
            <LuHouse size={17} />{t("shell.backHome")}
          </Link>
          <Link href="/guide" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-(--bd) bg-(--bgs) px-6 font-semibold text-(--tp) no-underline transition-colors hover:bg-(--bgm)">
            <LuArrowLeft size={17} />{t("shell.guide")}
          </Link>
        </div>
      </div>
    </main>
  );
}
