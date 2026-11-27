import { LuCircleCheck, LuCircleX } from "react-icons/lu";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/shared/Button";
import { verifyEmailToken } from "@/lib/actions/auth";

export const metadata = { title: "Verify Email — MealMate" };

export default async function VerifyEmailPage({ params }) {
  const { token } = await params;
  let success = false;
  let message = "";

  try {
    await verifyEmailToken(token);
    success = true;
    message = "Your email is verified. You can sign in now.";
  } catch (ex) {
    message = ex?.data?.message || "This verification link has expired or was already used.";
  }

  return (
    <AuthShell title={success ? "Email verified" : "Verification failed"} subtitle={message}>
      <div className="flex flex-col items-start gap-5">
        {success ? (
          <LuCircleCheck size={48} className="text-(--success)" aria-hidden="true" />
        ) : (
          <LuCircleX size={48} className="text-(--danger)" aria-hidden="true" />
        )}
        <Button variant="primary" href={success ? "/login" : "/register"} size="lg" isFullWidth>
          {success ? "Go to sign in" : "Back to sign up"}
        </Button>
      </div>
    </AuthShell>
  );
}