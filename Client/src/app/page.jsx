import HomeClient from "./HomeClient";

export const metadata = {
  title: "MealMate — Meal & Cost Tracker for Shared Living",
  description:
    "MealMate replaces Excel sheets for mess groups: slot-state meals, approved expenses, an immutable double-entry ledger, versioned month-end statements, and Bengali-friendly billing — built for shared living in Bangladesh.",
};

export default function HomePage() {
  return <HomeClient />;
}
