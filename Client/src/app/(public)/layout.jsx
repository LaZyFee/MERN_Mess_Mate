import { ToastProvider } from "@/components/shared/ToastProvider";
import Topbar from "@/components/shared/Topbar";

export default function PublicLayout({ children }) {
  return (
    <ToastProvider>
      <Topbar />
      <main className="min-h-[100dvh]">{children}</main>
    </ToastProvider>
  );
}
