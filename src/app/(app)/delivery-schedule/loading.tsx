import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveryScheduleLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <Skeleton className="h-[480px] w-full rounded-lg" />
    </div>
  );
}
