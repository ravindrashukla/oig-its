import Image from "next/image";
import { Shield } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Office of Inspector General
            </h1>
            <p className="text-xs text-muted-foreground">
              U.S. Office of Personnel Management
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <p className="text-xs text-muted-foreground">
            Office of Inspector General &mdash; U.S. Office of Personnel
            Management
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            All complaints are reviewed by the OIG. If you believe you are in
            immediate danger, please contact local law enforcement or call 911.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Developed by</span>
            <Image src="/ypoint-logo.png" alt="Y Point" width={60} height={30} className="opacity-30" />
          </div>
        </div>
      </footer>
    </div>
  );
}
