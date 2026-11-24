import Link from "next/link";
import { LuUtensils } from "react-icons/lu";
import { Suspense } from "react";
import styles from "../auth.module.css";
import LoginForm from "./LoginForm";
import Skeleton from "@/components/shared/Skeleton";

export const metadata = { title: "Sign In — MealMate" };

export default function LoginPage() {
  return (
    <main className={styles.authWrap}>
      <div className={styles.authCard}>
        <div className={styles.authLogo}>
          <LuUtensils size={28} className="[color:var(--p)]" />
          <span>MealMate</span>
        </div>
        <h1 className={styles.authTitle}>Welcome back</h1>
        <p className={styles.authSub}>Sign in to your MealMate account.</p>
        <Suspense fallback={<Skeleton variant="rect" height={180} />}>
          <LoginForm />
        </Suspense>
        <p className={styles.authFooter}>
          Don&apos;t have an account?{" "}
          <Link href="/register">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
