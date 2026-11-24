import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = { title: "Reset Password — MealMate" };

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  return <ResetPasswordClient token={params?.token || ""} />;
}
