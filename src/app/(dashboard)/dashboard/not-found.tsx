"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Shield className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground">
          The requested resource could not be found within the dashboard.
        </p>
      </div>
      <Button variant="default" render={<Link href="/dashboard" />}>
        Go to Dashboard
      </Button>
    </div>
  );
}
