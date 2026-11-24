import Link from "next/link";
import { LuUtensils } from "react-icons/lu";
import styles from "../auth.module.css";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Register — MealMate" };

export default function RegisterPage() {
  return (
    <main className={styles.authWrap}>
      <div className={styles.authCard}>
        <div className={styles.authLogo}>
          <LuUtensils size={28} className={["[color:var(--p)]"].filter(Boolean).join(" ")} />
          <span>MealMate</span>
        </div>
        <h1 className={styles.authTitle}>Create your account</h1>
        <p className={styles.authSub}>Join your mess and start tracking meals.</p>
        <RegisterForm />
        <p className={styles.authFooter}>
          Already have an account?{" "}
          <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
