import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Create Account — MealMate" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join your mess and start tracking meals and bazar together."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-(--p) no-underline hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}