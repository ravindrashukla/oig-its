"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Image from "next/image";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("samuel.johnson@oig.gov");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }

    window.location.href = result?.url ?? "/dashboard";
  }

  return (
    <>
      {/* Left panel — dark navy gradient */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-12">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="flex items-center justify-center size-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <Shield className="size-10 text-blue-300" />
          </div>

          <div className="flex items-center gap-2 opacity-80">
            <span className="text-[10px] text-blue-300/60 uppercase tracking-widest">Developed by</span>
            <Image src="/ypoint-logo.png" alt="Y Point" width={80} height={40} className="invert opacity-70" />
          </div>

          <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-300 uppercase">
            FedRAMP Authorized
          </span>

          <h1 className="text-3xl font-bold tracking-tight">
            Investigative Tracking System
          </h1>
          <p className="text-sm text-blue-200/70">
            Office of Personnel Management &mdash; Office of the Inspector General
          </p>

          <div className="mt-8 grid grid-cols-3 gap-6 w-full">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold tabular-nums">1,247</span>
              <span className="text-xs text-blue-300/60">Active Cases</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold tabular-nums">89%</span>
              <span className="text-xs text-blue-300/60">Closure Rate</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold tabular-nums">142</span>
              <span className="text-xs text-blue-300/60">Agents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — sign-in form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white p-8">
        <Card className="w-full max-w-sm border-0 shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex items-center justify-center size-10 rounded-lg bg-slate-900 lg:hidden">
              <Shield className="size-5 text-white" />
            </div>
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@oig.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
