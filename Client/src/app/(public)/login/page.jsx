import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import Skeleton from "@/components/shared/Skeleton";
import LoginForm from "./LoginForm";
import { verifyToken } from "@/lib/auth/authHelpers";

export const metadata = { title: "Sign In — MealMate" };

export default async function LoginPage() {
  const user = await verifyToken();
  if (user) redirect("/dashboard");

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to check today's meals, bazar and balances."
      footer={
        <>
          New to MealMate?{" "}
          <Link href="/register" className="font-semibold text-(--p) no-underline hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton variant="rect" height={220} />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}