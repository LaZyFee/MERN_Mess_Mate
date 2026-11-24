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
    <main className={["[max-width:640px]", "[margin:0_auto]", "[padding:var(--space-6)_var(--space-4)]"].filter(Boolean).join(" ")}>
      <h1 className={["[font-size:1.25rem]", "font-extrabold", "[color:var(--tp)]", "[margin-bottom:var(--space-6)]"].filter(Boolean).join(" ")}>
        Device Sessions
      </h1>
      <SessionsPanel initialSessions={initialSessions} />
    </main>
  );
}
