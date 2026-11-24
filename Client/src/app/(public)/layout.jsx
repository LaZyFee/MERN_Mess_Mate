import { ToastProvider } from "@/components/shared/ToastProvider";

export default function PublicLayout({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}
