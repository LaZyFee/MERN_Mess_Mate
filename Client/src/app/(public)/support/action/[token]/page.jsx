import SupportActionClient from "./SupportActionClient";

export const metadata = { title: "Support action — MealMate" };

export default async function SupportActionPage({ params }) {
  const { token } = await params;
  return <SupportActionClient token={token} />;
}
