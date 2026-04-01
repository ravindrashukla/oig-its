import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Pulsing OIG-ITS logo */}
      <div className="flex items-center gap-3 animate-pulse">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
          <Shield className="size-5 text-primary-foreground" />
        </div>
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
      </div>

      {/* Metric cards row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10 animate-pulse"
            style={{ animationDelay: `${(i + 4) * 100}ms` }}
          >
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-xl bg-card py-4 ring-1 ring-foreground/10 animate-pulse"
            style={{ animationDelay: `${(i + 7) * 100}ms` }}
          >
            <div className="flex items-center justify-between px-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-3 px-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
