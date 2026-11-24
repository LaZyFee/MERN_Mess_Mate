import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/actions/auth";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "Profile — MealMate" };

export default async function ProfilePage() {
  let profile;
  try {
    profile = await getProfile();
  } catch (error) {
    if (error?.status === 401) redirect("/login?next=%2Fprofile");
    throw error;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-extrabold text-(--tp)">My profile</h1>
        <div className="flex gap-2">
          <Link
            href="/profile/sessions"
            className="inline-flex min-h-11 items-center rounded-xl border border-(--bd2) px-3 text-sm font-semibold text-(--ts) hover:bg-(--pale) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
          >
            Device sessions
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-(--p) hover:bg-(--pale) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
          >
            Home
          </Link>
        </div>
      </div>
      <ProfileClient initialProfile={profile} />
    </main>
  );
}
