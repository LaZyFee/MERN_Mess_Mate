import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/authHelpers";

/**
 * Google OAuth callback — the backend sets mm_at / refreshToken / mm_csrf cookies via the BFF.
 * We just verify the session and redirect home.
 */
export default async function GoogleCallbackPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  if (error) redirect(`/login?error=${encodeURIComponent(error)}`);

  // After backend redirect, cookies should be set.
  // Verify session; if fails, redirect to login.
  const user = await verifyToken();
  if (!user) redirect("/login?error=google_failed");

  redirect("/");
}
