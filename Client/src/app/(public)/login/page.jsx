import Link from "next/link";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import Skeleton from "@/components/shared/Skeleton";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign In — MealMate" };

export default function LoginPage() {
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