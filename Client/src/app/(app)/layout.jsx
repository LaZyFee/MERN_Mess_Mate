import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/authHelpers";
import AuthHydrator from "@/lib/store/AuthHydrator";
import { ToastProvider } from "@/components/shared/ToastProvider";

export default async function AppLayout({ children }) {
  const user = await verifyToken();
  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <AuthHydrator initialUser={user} />
      {children}
    </ToastProvider>
  );
}
