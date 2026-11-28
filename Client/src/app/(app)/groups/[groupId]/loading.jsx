/**
 * Route-level loading UI for the group shell.
 * Mirrors the overview layout so the first paint never jumps.
 */
import Skeleton from "@/components/shared/Skeleton";

export default function GroupLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-3 px-3 pt-3 sm:px-5 sm:pt-5">
      <Skeleton variant="rect" height={196} className="rounded-3xl" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} variant="rect" height={82} className="rounded-2xl" />
        ))}
      </div>
      <Skeleton variant="rect" height={180} className="rounded-2xl" />
    </div>
  );
}
