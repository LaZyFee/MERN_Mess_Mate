import SessionsPanel from "./SessionsPanel";
import { getSessions } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Sessions — MealMate" };

export default async function SessionsPage() {
  let initialSessions;
  try {
    initialSessions = await getSessions();
  } catch (error) {
    if (error?.status === 401) redirect("/login?next=%2Fprofile%2Fsessions");
    throw error;
  }
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-9">
      <header className="mb-6 rounded-3xl bg-(--brand-bg) px-5 py-7 text-(--brand-fg) sm:px-8">
        <p className="text-sm font-semibold text-(--brand-on)">Account security</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Device sessions</h1>
        <p className="mt-2 text-sm leading-relaxed text-(--brand-mute)">Review signed-in devices and revoke access you no longer recognize.</p>
      </header>
      <SessionsPanel initialSessions={initialSessions} />
    </main>
  );
}
