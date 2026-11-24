import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/authHelpers";
import AuthHydrator from "@/lib/store/AuthHydrator";
import { ToastProvider } from "@/components/shared/ToastProvider";
import RealtimeProvider from "@/components/realtime/RealtimeProvider";
import AppChrome from "./AppChrome";

export default async function AppLayout({ children }) {
  const user = await verifyToken();
  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <AuthHydrator initialUser={user} />
      <RealtimeProvider />
      <AppChrome>{children}</AppChrome>
    </ToastProvider>
  );
}
