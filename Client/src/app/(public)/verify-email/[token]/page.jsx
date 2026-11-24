import { LuUtensils, LuCircleCheck, LuCircleX } from "react-icons/lu";
import { verifyEmailToken } from "@/lib/actions/auth";
import styles from "../../auth.module.css";

export const metadata = { title: "Verify Email — MealMate" };

export default async function VerifyEmailPage({ params }) {
  const { token } = await params;
  let success = false;
  let message = "";

  try {
    await verifyEmailToken(token);
    success = true;
    message = "Your email is verified! You can now sign in.";
  } catch (ex) {
    message = ex?.data?.message || ex?.message || "Verification failed or link expired.";
  }

  return (
    <main className={styles.authWrap}>
      <div  className={`${styles.authCard} text-center`}>
        <div  className={`${styles.authLogo} justify-center`}>
          <LuUtensils size={28} className="[color:var(--p)]" />
          <span>MealMate</span>
        </div>
        <div className="my-6">
          {success ? (
            <LuCircleCheck size={56} className="[color:var(--success)] mx-auto" />
          ) : (
            <LuCircleX size={56} className="[color:var(--danger)] mx-auto" />
          )}
        </div>
        <h1 className={styles.authTitle}>{success ? "Email Verified!" : "Verification Failed"}</h1>
        <p className={styles.authSub}>{message}</p>
        <a
          href={success ? "/login" : "/register"}
          className="inline-flex items-center justify-center [min-height:44px] [padding:0_var(--space-6)] [border-radius:var(--r-pill)] [background:var(--p)] [color:var(--bgs)] font-semibold [font-size:0.9375rem] [text-decoration:none] [transition:var(--transition)] mt-4"
        >
          {success ? "Go to Sign In" : "Back to Register"}
        </a>
      </div>
    </main>
  );
}
