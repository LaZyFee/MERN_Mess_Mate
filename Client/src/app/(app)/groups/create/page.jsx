
import CreateGroupClient from "./CreateGroupClient";
import PageHeader from "@/components/shared/PageHeader";

export const metadata = {
  title: "Create Group — MealMate",
};

export default function CreateGroupPage() {
  return (
    <main className="min-h-[100dvh] bg-(--bg) px-4 py-6">
      <PageHeader
        eyebrow="Get Started"
        title="Create Your Mess Group"
        description="Set up your MealMate group, invite your roommates, and start managing daily meals, shared expenses, and monthly balances — all in one place."
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <CreateGroupClient />
    </main>
  );
}
