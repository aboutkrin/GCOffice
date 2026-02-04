import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      {/* Page header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* This Month Stats cards skeleton */}
      <div className="mb-6">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`thisMonth-${i}`} className="rounded-lg border bg-card p-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* All Time Stats cards skeleton */}
      <div>
        <Skeleton className="h-6 w-20 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`allTime-${i}`} className="rounded-lg border bg-card p-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent documents table skeleton */}
      <div className="mt-6">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b p-4 last:border-b-0">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
