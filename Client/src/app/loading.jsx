import Skeleton from "@/components/shared/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-[100dvh] bg-[var(--bg)] p-4 sm:p-8 space-y-4">
      <Skeleton variant="rect" height={48} borderRadius={16} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rect" height={120} borderRadius={16} />
        ))}
      </div>
    </main>
  );
}