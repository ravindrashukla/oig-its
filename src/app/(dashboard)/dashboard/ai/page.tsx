"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  Users,
  Network,
  FileText,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────

interface DuplicatePair {
  subject1: { id: string; firstName?: string; lastName?: string; orgName?: string };
  subject2: { id: string; firstName?: string; lastName?: string; orgName?: string };
  confidence: number;
  matchReasons: string[];
}

interface NetworkHub {
  id: string;
  type: string;
  label: string;
  degree: number;
}

interface FraudRing {
  members: { id: string; name: string }[];
  linkedCases: { id: string; caseNumber: string }[];
  sharedCaseCount: number;
}

interface Cluster {
  id: number;
  label: string;
  caseCount: number;
  topType: string;
  topSource: string;
  caseIds: string[];
}

interface RecentClassification {
  id: string;
  title: string;
  fileName: string;
  aiCategory: string;
  aiTags: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function subjectName(s: {
  firstName?: string | null;
  lastName?: string | null;
  orgName?: string | null;
}): string {
  return (
    s.orgName ||
    [s.firstName, s.lastName].filter(Boolean).join(" ") ||
    "Unknown"
  );
}

function categoryLabel(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page Component ───────────────────────────────────────────

export default function AIInsightsPage() {
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [hubs, setHubs] = useState<NetworkHub[]>([]);
  const [fraudRings, setFraudRings] = useState<FraudRing[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dupRes, netRes, clusterRes] = await Promise.all([
        fetch("/api/ai/duplicate-subjects").then((r) => r.json()),
        fetch("/api/ai/network").then((r) => r.json()),
        fetch("/api/ai/clusters").then((r) => r.json()),
      ]);

      if (dupRes.duplicates) setDuplicates(dupRes.duplicates.slice(0, 10));
      if (netRes.hubs) setHubs(netRes.hubs.slice(0, 10));
      if (netRes.fraudRings) setFraudRings(netRes.fraudRings.slice(0, 5));
      if (clusterRes.clusters) setClusters(clusterRes.clusters);
    } catch (err) {
      console.error("AI Insights fetch error:", err);
      setError("Failed to load AI insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">
          Analyzing data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
            <p className="text-sm text-muted-foreground">
              Automated analysis of cases, subjects, and documents
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{duplicates.length}</p>
                <p className="text-xs text-muted-foreground">Potential Duplicates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Network className="size-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{hubs.length}</p>
                <p className="text-xs text-muted-foreground">Network Hubs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{fraudRings.length}</p>
                <p className="text-xs text-muted-foreground">Potential Fraud Rings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{clusters.length}</p>
                <p className="text-xs text-muted-foreground">Case Clusters</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Potential Duplicate Subjects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Potential Duplicate Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {duplicates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No potential duplicates detected.
              </p>
            ) : (
              <div className="space-y-3">
                {duplicates.slice(0, 5).map((d, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span>{subjectName(d.subject1)}</span>
                        <ChevronRight className="size-3 text-muted-foreground" />
                        <span>{subjectName(d.subject2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {d.matchReasons.map((r, j) => (
                          <span
                            key={j}
                            className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {Math.round(d.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Hub Entities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="size-4" />
              Network Hub Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hubs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No highly connected entities found.
              </p>
            ) : (
              <div className="space-y-2">
                {hubs.map((hub) => (
                  <div
                    key={hub.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          hub.type === "subject"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {hub.type}
                      </span>
                      <span className="text-sm font-medium">{hub.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {hub.degree} connections
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Potential Fraud Rings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-red-500" />
              Potential Fraud Rings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fraudRings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No potential fraud rings detected.
              </p>
            ) : (
              <div className="space-y-3">
                {fraudRings.map((ring, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        Ring #{i + 1} ({ring.members.length} members)
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ring.sharedCaseCount} shared cases
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ring.members.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ring.linkedCases.map((c) => (
                        <Link
                          key={c.id}
                          href={`/dashboard/cases/${c.id}`}
                          className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Clusters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Case Clusters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No clusters computed. Add more cases.
              </p>
            ) : (
              <div className="space-y-2">
                {clusters.map((cl) => (
                  <div
                    key={cl.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium">{cl.label}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Type: {cl.topType}</span>
                        <span>Source: {cl.topSource}</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      {cl.caseCount} cases
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
