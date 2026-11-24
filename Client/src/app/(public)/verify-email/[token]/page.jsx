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
      <div  className={[styles.authCard, "[text-align:center]"].filter(Boolean).join(" ")}>
        <div  className={[styles.authLogo, "[justify-content:center]"].filter(Boolean).join(" ")}>
          <LuUtensils size={28} className={["[color:var(--p)]"].filter(Boolean).join(" ")} />
          <span>MealMate</span>
        </div>
        <div className={["[margin:var(--space-6)_0]"].filter(Boolean).join(" ")}>
          {success ? (
            <LuCircleCheck size={56} className={["[color:var(--success)]", "[margin:0_auto]"].filter(Boolean).join(" ")} />
          ) : (
            <LuCircleX size={56} className={["[color:var(--danger)]", "[margin:0_auto]"].filter(Boolean).join(" ")} />
          )}
        </div>
        <h1 className={styles.authTitle}>{success ? "Email Verified!" : "Verification Failed"}</h1>
        <p className={styles.authSub}>{message}</p>
        <a
          href={success ? "/login" : "/register"}
          className={["[display:inline-flex]", "[align-items:center]", "[justify-content:center]", "[min-height:44px]", "[padding:0_var(--space-6)]", "[border-radius:var(--r-pill)]", "[background:var(--p)]", "[color:var(--bgs)]", "font-semibold", "[font-size:0.9375rem]", "[text-decoration:none]", "[transition:var(--transition)]", "[margin-top:var(--space-4)]"].filter(Boolean).join(" ")}
        >
          {success ? "Go to Sign In" : "Back to Register"}
        </a>
      </div>
    </main>
  );
}
