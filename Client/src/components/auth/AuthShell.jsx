import Link from "next/link";
import { LuUtensils } from "react-icons/lu";
import MealTally from "./MealTally";

/**
 * Shared frame for every public auth page.
 * Mobile: single column, logo + form. lg+: dark brand panel beside the form.
 * Server component — no hooks.
 */
export default function AuthShell({ title, subtitle, footer, children }) {
    return (
        <main className="grid min-h-[100dvh] bg-(--bg) lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <aside className="hidden flex-col justify-between bg-(--brand-bg) p-10 text-(--brand-fg) lg:flex xl:p-14">
                <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-extrabold text-(--brand-fg) no-underline">
                    <span className="grid size-10 place-items-center rounded-xl bg-(--brand-on) text-(--brand-bg)">
                        <LuUtensils size={20} />
                    </span>
                    MealMate
                </Link>

                <div>
                    <h2 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
                        Every meal counted. Every taka accounted for.
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-(--brand-mute)">
                        Meals, bazar and month-end statements for your mess, in one place everyone can check.
                    </p>
                    <MealTally className="mt-10" />
                </div>

                <p className="text-xs text-(--brand-mute)">Amounts in ৳ · dates in Dhaka time</p>
            </aside>

            <section className="flex min-w-0 flex-col justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
                <div className="mx-auto w-full max-w-md">
                    <Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2.5 text-lg font-extrabold text-(--tp) no-underline lg:hidden">
                        <span className="grid size-10 place-items-center rounded-xl bg-(--p) text-(--bgs)">
                            <LuUtensils size={20} />
                        </span>
                        MealMate
                    </Link>

                    <h1 className="text-2xl font-extrabold tracking-tight text-(--tp) sm:text-3xl">{title}</h1>
                    {subtitle && <p className="mt-2 text-sm leading-relaxed text-(--tm)">{subtitle}</p>}

                    <div className="mt-6">{children}</div>

                    {footer && <div className="mt-6 text-sm text-(--tm)">{footer}</div>}
                </div>
            </section>
        </main>
    );
}