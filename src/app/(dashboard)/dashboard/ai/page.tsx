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
  Search,
  MessageSquare,
  ClipboardList,
  Bot,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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

// ─── Claude AI Types ─────────────────────────────────────────

interface NaturalSearchResult {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  caseType: string;
  priority: string;
}

interface InterviewQuestions {
  openingQuestions: string[];
  substantiveQuestions: string[];
  probeQuestions: string[];
  closingQuestions: string[];
  interviewTips: string[];
}

// ─── Page Component ───────────────────────────────────────────

export default function AIInsightsPage() {
  useEffect(() => { document.title = "AI Insights | OIG-ITS"; }, []);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [hubs, setHubs] = useState<NetworkHub[]>([]);
  const [fraudRings, setFraudRings] = useState<FraudRing[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Claude AI state
  const [nlQuery, setNlQuery] = useState("");
  const [nlResults, setNlResults] = useState<NaturalSearchResult[]>([]);
  const [nlFilters, setNlFilters] = useState<Record<string, unknown> | null>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  const [iqCaseType, setIqCaseType] = useState("FRAUD");
  const [iqSubjectRole, setIqSubjectRole] = useState("respondent");
  const [iqDescription, setIqDescription] = useState("");
  const [iqQuestions, setIqQuestions] = useState<InterviewQuestions | null>(null);
  const [iqLoading, setIqLoading] = useState(false);
  const [iqError, setIqError] = useState<string | null>(null);

  const [reportCaseId, setReportCaseId] = useState("");
  const [reportType, setReportType] = useState("summary");
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleNaturalSearch = useCallback(async () => {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    setNlError(null);
    setNlResults([]);
    setNlFilters(null);
    try {
      const res = await fetch("/api/ai/natural-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setNlResults(data.results || []);
      setNlFilters(data.filters || null);
    } catch (err) {
      setNlError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setNlLoading(false);
    }
  }, [nlQuery]);

  const handleGenerateQuestions = useCallback(async () => {
    setIqLoading(true);
    setIqError(null);
    setIqQuestions(null);
    try {
      const res = await fetch("/api/ai/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseType: iqCaseType,
          subjectRole: iqSubjectRole,
          caseDescription: iqDescription || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate questions");
      setIqQuestions(data.questions);
    } catch (err) {
      setIqError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIqLoading(false);
    }
  }, [iqCaseType, iqSubjectRole, iqDescription]);

  const handleGenerateReport = useCallback(async () => {
    if (!reportCaseId.trim()) return;
    setReportLoading(true);
    setReportError(null);
    setReportContent(null);
    try {
      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: reportCaseId, reportType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Report generation failed");
      setReportContent(data.report);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setReportLoading(false);
    }
  }, [reportCaseId, reportType]);

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

      {/* ─── Claude AI Section ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
            <Bot className="size-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Claude AI</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered search, report generation, and interview preparation
            </p>
          </div>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList>
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="size-3.5" />
              Natural Language Search
            </TabsTrigger>
            <TabsTrigger value="interview" className="gap-1.5">
              <MessageSquare className="size-3.5" />
              Interview Questions
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5">
              <ClipboardList className="size-3.5" />
              Generate Report
            </TabsTrigger>
          </TabsList>

          {/* Natural Language Search */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="size-4" />
                  Search Cases with Natural Language
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder='e.g. "Show me all fraud cases from 2025 with recoveries over $500K"'
                    value={nlQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNlQuery(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter") handleNaturalSearch();
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleNaturalSearch} disabled={nlLoading || !nlQuery.trim()}>
                    {nlLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                    Search
                  </Button>
                </div>

                {nlError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {nlError}
                  </div>
                )}

                {nlFilters && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground">Interpreted filters:</span>
                    {Object.entries(nlFilters).map(([key, val]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {String(val)}
                      </Badge>
                    ))}
                  </div>
                )}

                {nlResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{nlResults.length} result{nlResults.length !== 1 ? "s" : ""} found</p>
                    {nlResults.map((r) => (
                      <Link
                        key={r.id}
                        href={`/dashboard/cases/${r.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{r.caseNumber}</span>
                            <span className="text-sm text-muted-foreground">{r.title}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{r.status}</Badge>
                          <Badge variant="secondary" className="text-xs">{r.caseType}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {!nlLoading && nlFilters && nlResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">No cases match the interpreted query.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interview Questions */}
          <TabsContent value="interview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="size-4" />
                  Generate Interview Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Case Type</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={iqCaseType}
                      onChange={(e) => setIqCaseType(e.target.value)}
                    >
                      <option value="FRAUD">Fraud</option>
                      <option value="WASTE">Waste</option>
                      <option value="ABUSE">Abuse</option>
                      <option value="MISCONDUCT">Misconduct</option>
                      <option value="WHISTLEBLOWER">Whistleblower</option>
                      <option value="COMPLIANCE">Compliance</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Subject Role</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={iqSubjectRole}
                      onChange={(e) => setIqSubjectRole(e.target.value)}
                    >
                      <option value="complainant">Complainant</option>
                      <option value="respondent">Respondent</option>
                      <option value="witness">Witness</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Case Description (optional)</label>
                  <Textarea
                    placeholder="Briefly describe the case and allegations..."
                    value={iqDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setIqDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleGenerateQuestions} disabled={iqLoading}>
                  {iqLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageSquare className="mr-2 size-4" />}
                  Generate Questions
                </Button>

                {iqError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {iqError}
                  </div>
                )}

                {iqQuestions && (
                  <div className="space-y-4 rounded-lg border p-4">
                    {([
                      ["Opening Questions", iqQuestions.openingQuestions],
                      ["Substantive Questions", iqQuestions.substantiveQuestions],
                      ["Probe Questions", iqQuestions.probeQuestions],
                      ["Closing Questions", iqQuestions.closingQuestions],
                    ] as [string, string[]][]).map(([heading, items]) => (
                      <div key={heading} className="space-y-2">
                        <h4 className="text-sm font-semibold">{heading}</h4>
                        <ul className="ml-4 list-disc space-y-1 text-sm">
                          {items.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {iqQuestions.interviewTips.length > 0 && (
                      <div className="space-y-2 border-t pt-3">
                        <h4 className="text-sm font-semibold">Interview Tips</h4>
                        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                          {iqQuestions.interviewTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generate Report */}
          <TabsContent value="report" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="size-4" />
                  Generate Case Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Case ID</label>
                    <Input
                      placeholder="Enter case ID..."
                      value={reportCaseId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportCaseId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Report Type</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                    >
                      <option value="summary">Summary</option>
                      <option value="narrative">Narrative</option>
                      <option value="findings">Findings</option>
                      <option value="recommendation">Recommendation</option>
                    </select>
                  </div>
                </div>
                <Button onClick={handleGenerateReport} disabled={reportLoading || !reportCaseId.trim()}>
                  {reportLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
                  Generate Report
                </Button>

                {reportError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {reportError}
                  </div>
                )}

                {reportContent && (
                  <div className="rounded-lg border p-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm">
                      {reportContent}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
