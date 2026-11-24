export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-[var(--bg)] text-[var(--tp)] flex items-center justify-center p-6">
      <div className="bg-[var(--bgs)] border-[var(--bd)] rounded-2xl shadow-[var(--shadow-lg)] p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-[var(--tp)]">MealMate</h1>
        <p className="mt-2 text-sm text-[var(--tm)]">
          Meal &amp; cost tracker for shared living. Foundation setup in progress.
        </p>
        <a
          href="/login"
          className="mt-6 inline-flex items-center justify-center min-h-[44px] px-5 rounded-[var(--r-pill)] bg-[var(--p)] text-[var(--bgs)] font-semibold text-sm transition-[var(--transition)] hover:opacity-90"
        >
          Go to Login
        </a>
      </div>
    </main>
  );
}