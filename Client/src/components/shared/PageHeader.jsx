
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

/**
 * PageHeader — shared branded page header for the app shell.
 *
 * @param {string} eyebrow
 * @param {string} title
 * @param {string} [description]
 * @param {string} [className]
 * @param {"header"|"div"} [as="header"]
 * @param {string} [backHref]
 * @param {string} [backLabel="Back"]
 * @param {React.ReactNode} [actions]
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  className = "",
  as = "header",
  backHref,
  backLabel = "Back",
  actions,
}) {
  const As = as === "div" ? "div" : "header";

  return (
    <As
      className={`relative isolate overflow-hidden rounded-[2rem] bg-(--brand-bg) px-5 py-6 text-(--brand-fg) shadow-sm ring-1 ring-(--brand-on)/15 sm:px-8 sm:py-8 ${className}`}
    >
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-(--brand-on) opacity-20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-10 -z-10 h-56 w-56 rounded-full bg-(--brand-on) opacity-10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 text-(--brand-on) opacity-[0.12] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]"
      />

      {/* Main content */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Title block */}
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="mt-1.5 hidden h-12 w-1 shrink-0 rounded-full bg-(--brand-on) sm:block"
          />

          <div className="min-w-0">
            {eyebrow && (
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-(--brand-on)">
                <span className="h-1.5 w-1.5 rounded-full bg-(--brand-on)" />
                {eyebrow}
              </p>
            )}

            <h1 className="mt-2 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {title}
            </h1>

            {description && (
              <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-(--brand-mute) sm:text-base">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Back button + Actions */}
        {(backHref || actions) && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:self-center">
            {backHref && (
              <Link
                href={backHref}
                className="group inline-flex min-h-10 items-center gap-2 rounded-full bg-(--brand-fg)/10 py-1.5 pl-2 pr-4 text-sm font-semibold text-(--brand-fg) ring-1 ring-(--brand-fg)/15 backdrop-blur transition hover:bg-(--brand-fg)/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-on)"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--brand-fg)/15 transition-transform group-hover:-translate-x-0.5">
                  <LuArrowLeft size={14} />
                </span>
                {backLabel}
              </Link>
            )}

            {actions && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {actions}
              </div>
            )}
          </div>
        )}
      </div>
    </As>
  );
}
