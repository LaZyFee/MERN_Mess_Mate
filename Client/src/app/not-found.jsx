export default function NotFound() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 bg-[var(--bg)]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[var(--tp)]">404</h1>
        <p className="mt-3 text-[var(--tm)]">This page doesn&apos;t exist.</p>
        <a href="/" className="mt-6 inline-block min-h-[44px] leading-[44px] px-6 rounded-[var(--r-pill)] bg-[var(--p)] text-white font-semibold">
          Back home
        </a>
      </div>
    </main>
  );
}