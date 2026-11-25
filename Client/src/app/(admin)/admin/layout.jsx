/**
 * SSR Layout — hidden platform-admin plane (§8.5).
 * Probes the backend through serverApi; non-admins (403/404) get notFound() so
 * the /admin section does not exist for them and no user-facing surface ever
 * links here. The shell is a client component that owns nav state.
 */
import { notFound } from "next/navigation";
import { getAdminOverview } from "@/lib/actions/platform";
import AdminShell from "./AdminShell";

export const metadata = {
  title: "Control plane — MealMate",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  const overview = await getAdminOverview();
  if (!overview) notFound();

  return <AdminShell initialOverview={overview}>{children}</AdminShell>;
}
