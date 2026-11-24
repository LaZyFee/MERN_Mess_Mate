import JoinClient from "./JoinClient";

export const metadata = { title: "Join a Group — MealMate" };

export default async function JoinPage({ searchParams }) {
  const params = await searchParams;
  return <JoinClient initialCode={params?.code || ""} />;
}
