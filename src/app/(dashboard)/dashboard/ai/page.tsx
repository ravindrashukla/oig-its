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
  Shield,
  BarChart3,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Layers,
  Scale,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────

interface Anomaly {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  score: number;
  caseId?: string;
  caseNumber?: string;
}

interface Escalation {
  caseId: string;
  caseNumber: string;
  title: string;
  currentPriority: string;
  recommendedPriority: string;
  reason: string;
  score: number;
}

interface FinancialPattern {
  id: string;
  type: string;
  severity: string;
  description: string;
  amount?: number;
  caseIds?: string[];
}

interface SimilarCase {
  id: string;
  caseNumber: string;
  title: string;
  similarity: number;
  caseType: string;
}

interface Cluster {
  id: number;
  label: string;
  caseCount: number;
  topType: string;
  topSource: string;
  caseIds: string[];
}

interface CaseNarrative {
  narrative: string;
  caseNumber?: string;
}

interface ClosureReadiness {
  score: number;
  grade: string;
  missingItems: { item: string; completed: boolean }[];
  recommendations: string[];
}

interface EvidenceStrength {
  score: number;
  grade: string;
  breakdown: { category: string; score: number; notes: string }[];
}

interface TimelineAnomaly {
  id: string;
  eventDate: string;
  description: string;
  anomalyType: string;
  severity: string;
}

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

interface SubjectRisk {
  id: string;
  name: string;
  riskScore: number;
  riskLevel: string;
  factors: string[];
}

interface InvestigatorRecommendation {
  investigatorId: string;
  name: string;
  score: number;
  reasons: string[];
}

interface WorkloadEntry {
  investigatorId: string;
  name: string;
  workloadScore: number;
  activeCases: number;
  status: string;
}

interface Prediction {
  atRiskCases: { id: string; caseNumber: string; risk: string; reason: string }[];
  caseloadForecast: { period: string; predicted: number }[];
  avgPredictedDuration: number;
}

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

interface RiskScoreResult {
  score: number;
  riskLevel: string;
  factors: { factor: string; weight: number; contribution: number }[];
}

interface ComplaintDedupResult {
  duplicates: { id: string; caseNumber: string; title: string; similarity: number }[];
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

function severityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "bg-red-500 text-white";
    case "HIGH":
      return "bg-orange-500 text-white";
    case "MEDIUM":
      return "bg-yellow-500 text-black";
    case "LOW":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-yellow-500";
  if (score >= 20) return "bg-blue-500";
  return "bg-green-500";
}

function gradeColor(grade: string): string {
  switch (grade.toUpperCase()) {
    case "A":
      return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    case "B":
      return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
    case "C":
      return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "D":
      return "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
    case "F":
      return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

// ─── Reusable Loading / Error / Empty ─────────────────────────

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
    </div>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-4 text-sm text-muted-foreground">{message}</p>;
}

// ─── Score Bar Component ──────────────────────────────────────

function ScoreBar({ score, max = 100, className = "" }: { score: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  return (
    <div className={`h-3 w-full rounded-full bg-muted ${className}`}>
      <div
        className={`h-3 rounded-full transition-all ${scoreBarColor(pct)}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Custom hook for simple GET fetches ───────────────────────

function useFetchData<T>(url: string, immediate = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (immediate) fetchData();
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
}

// ===================================================================
// TAB 1: Alerts & Anomalies
// ===================================================================

function AlertsAnomaliesTab() {
  const { data: anomalyData, loading: anomLoading, error: anomError } =
    useFetchData<{ anomalies: Anomaly[] }>("/api/ai/anomalies");
  const { data: escalationData, loading: escLoading, error: escError } =
    useFetchData<{ escalations: Escalation[] }>("/api/ai/escalations");
  const { data: finData, loading: finLoading, error: finError } =
    useFetchData<{ patterns: FinancialPattern[] }>("/api/ai/financial-patterns");

  return (
    <div className="space-y-6">
      {/* Anomaly Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            Anomaly Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomLoading && <SectionLoader />}
          {anomError && <SectionError message={anomError} />}
          {!anomLoading && !anomError && (!anomalyData?.anomalies || anomalyData.anomalies.length === 0) && (
            <EmptyState message="No anomalies detected." />
          )}
          {anomalyData?.anomalies && anomalyData.anomalies.length > 0 && (
            <div className="space-y-3">
              {anomalyData.anomalies.map((a, i) => (
                <div key={a.id || i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${severityColor(a.severity)}`}>
                        {a.severity}
                      </span>
                      <span className="text-sm font-medium">{a.type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Score: {a.score}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  {a.caseNumber && (
                    <Link href={`/dashboard/cases/${a.caseId}`} className="text-xs text-primary hover:underline">
                      Case {a.caseNumber}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Escalation Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpRight className="size-4 text-orange-500" />
            Auto-Escalation Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {escLoading && <SectionLoader />}
          {escError && <SectionError message={escError} />}
          {!escLoading && !escError && (!escalationData?.escalations || escalationData.escalations.length === 0) && (
            <EmptyState message="No escalation recommendations at this time." />
          )}
          {escalationData?.escalations && escalationData.escalations.length > 0 && (
            <div className="space-y-3">
              {escalationData.escalations.map((e, i) => (
                <div key={e.caseId || i} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{e.caseNumber}</span>
                      <span className="text-sm text-muted-foreground truncate max-w-xs">{e.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{e.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{e.currentPriority}</Badge>
                    <ChevronRight className="size-3 text-muted-foreground" />
                    <Badge className="bg-orange-500 text-white">{e.recommendedPriority}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-green-600" />
            Financial Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finLoading && <SectionLoader />}
          {finError && <SectionError message={finError} />}
          {!finLoading && !finError && (!finData?.patterns || finData.patterns.length === 0) && (
            <EmptyState message="No financial patterns detected." />
          )}
          {finData?.patterns && finData.patterns.length > 0 && (
            <div className="space-y-3">
              {finData.patterns.map((p, i) => (
                <div key={p.id || i} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${severityColor(p.severity)}`}>
                        {p.severity}
                      </span>
                      <span className="text-sm font-medium">{p.type}</span>
                    </div>
                    {p.amount !== undefined && (
                      <span className="text-sm font-semibold">${p.amount.toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// TAB 2: Case Intelligence
// ===================================================================

function CaseIntelligenceTab() {
  // Similar Cases
  const [simCaseId, setSimCaseId] = useState("");
  const [simResults, setSimResults] = useState<SimilarCase[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const fetchSimilar = useCallback(async () => {
    if (!simCaseId.trim()) return;
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await fetch(`/api/ai/similar-cases?caseId=${encodeURIComponent(simCaseId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setSimResults(json.similarCases || []);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSimLoading(false);
    }
  }, [simCaseId]);

  // Clusters
  const { data: clusterData, loading: clLoading, error: clError } =
    useFetchData<{ clusters: Cluster[] }>("/api/ai/clusters");

  // Case Narrative
  const [narrCaseId, setNarrCaseId] = useState("");
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrLoading, setNarrLoading] = useState(false);
  const [narrError, setNarrError] = useState<string | null>(null);

  const fetchNarrative = useCallback(async () => {
    if (!narrCaseId.trim()) return;
    setNarrLoading(true);
    setNarrError(null);
    try {
      const res = await fetch(`/api/ai/case-narrative?caseId=${encodeURIComponent(narrCaseId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setNarrative(json.narrative || "No narrative generated.");
    } catch (err) {
      setNarrError(err instanceof Error ? err.message : "Failed");
    } finally {
      setNarrLoading(false);
    }
  }, [narrCaseId]);

  // Closure Readiness
  const [closCaseId, setClosCaseId] = useState("");
  const [closureData, setClosureData] = useState<ClosureReadiness | null>(null);
  const [closLoading, setClosLoading] = useState(false);
  const [closError, setClosError] = useState<string | null>(null);

  const fetchClosure = useCallback(async () => {
    if (!closCaseId.trim()) return;
    setClosLoading(true);
    setClosError(null);
    try {
      const res = await fetch(`/api/ai/closure-readiness?caseId=${encodeURIComponent(closCaseId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setClosureData(json);
    } catch (err) {
      setClosError(err instanceof Error ? err.message : "Failed");
    } finally {
      setClosLoading(false);
    }
  }, [closCaseId]);

  return (
    <div className="space-y-6">
      {/* Case Similarity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-blue-500" />
            Case Similarity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Case ID..."
              value={simCaseId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSimCaseId(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") fetchSimilar(); }}
              className="flex-1"
            />
            <Button onClick={fetchSimilar} disabled={simLoading || !simCaseId.trim()}>
              {simLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
              Find Similar
            </Button>
          </div>
          {simError && <SectionError message={simError} />}
          {simResults.length > 0 && (
            <div className="space-y-2">
              {simResults.map((s) => (
                <div key={s.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link href={`/dashboard/cases/${s.id}`} className="text-sm font-medium text-primary hover:underline">
                      {s.caseNumber} - {s.title}
                    </Link>
                    <Badge variant="outline">{s.caseType}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">{Math.round(s.similarity * 100)}%</span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.round(s.similarity * 100)}%` }}
                      />
                    </div>
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
            <Sparkles className="size-4 text-purple-500" />
            Case Clusters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clLoading && <SectionLoader />}
          {clError && <SectionError message={clError} />}
          {!clLoading && !clError && (!clusterData?.clusters || clusterData.clusters.length === 0) && (
            <EmptyState message="No clusters computed. Add more cases." />
          )}
          {clusterData?.clusters && clusterData.clusters.length > 0 && (
            <div className="space-y-2">
              {clusterData.clusters.map((cl) => (
                <div key={cl.id} className="flex items-center justify-between rounded-lg border p-3">
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

      {/* Case Narrative */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-indigo-500" />
            Case Narrative Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Case ID..."
              value={narrCaseId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNarrCaseId(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") fetchNarrative(); }}
              className="flex-1"
            />
            <Button onClick={fetchNarrative} disabled={narrLoading || !narrCaseId.trim()}>
              {narrLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
              Generate
            </Button>
          </div>
          {narrError && <SectionError message={narrError} />}
          {narrative && (
            <div className="rounded-lg border p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm">
                {narrative}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Closure Readiness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="size-4 text-green-500" />
            Closure Readiness Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Case ID..."
              value={closCaseId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClosCaseId(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") fetchClosure(); }}
              className="flex-1"
            />
            <Button onClick={fetchClosure} disabled={closLoading || !closCaseId.trim()}>
              {closLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle className="mr-2 size-4" />}
              Check
            </Button>
          </div>
          {closError && <SectionError message={closError} />}
          {closureData && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{closureData.score}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <ScoreBar score={closureData.score} className="flex-1" />
                {closureData.grade && (
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${gradeColor(closureData.grade)}`}>
                    {closureData.grade}
                  </span>
                )}
              </div>
              {closureData.missingItems && closureData.missingItems.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Checklist Items</h4>
                  {closureData.missingItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {item.completed ? (
                        <CheckCircle className="size-4 text-green-500" />
                      ) : (
                        <XCircle className="size-4 text-red-500" />
                      )}
                      <span className={item.completed ? "text-muted-foreground line-through" : ""}>{item.item}</span>
                    </div>
                  ))}
                </div>
              )}
              {closureData.recommendations && closureData.recommendations.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Recommendations</h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                    {closureData.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// TAB 3: Evidence & Timeline
// ===================================================================

function EvidenceTimelineTab() {
  // Evidence Strength
  const [evCaseId, setEvCaseId] = useState("");
  const [evData, setEvData] = useState<EvidenceStrength | null>(null);
  const [evLoading, setEvLoading] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);

  const fetchEvidence = useCallback(async () => {
    if (!evCaseId.trim()) return;
    setEvLoading(true);
    setEvError(null);
    try {
      const res = await fetch(`/api/ai/evidence-strength?caseId=${encodeURIComponent(evCaseId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setEvData(json);
    } catch (err) {
      setEvError(err instanceof Error ? err.message : "Failed");
    } finally {
      setEvLoading(false);
    }
  }, [evCaseId]);

  // Timeline Anomalies
  const [tlCaseId, setTlCaseId] = useState("");
  const [tlData, setTlData] = useState<TimelineAnomaly[]>([]);
  const [tlLoading, setTlLoading] = useState(false);
  const [tlError, setTlError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!tlCaseId.trim()) return;
    setTlLoading(true);
    setTlError(null);
    try {
      const res = await fetch(`/api/ai/timeline-anomalies?caseId=${encodeURIComponent(tlCaseId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setTlData(json.anomalies || []);
    } catch (err) {
      setTlError(err instanceof Error ? err.message : "Failed");
    } finally {
      setTlLoading(false);
    }
  }, [tlCaseId]);

  return (
    <div className="space-y-6">
      {/* Evidence Strength */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4 text-blue-600" />
            Evidence Strength Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Case ID..."
              value={evCaseId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEvCaseId(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") fetchEvidence(); }}
              className="flex-1"
            />
            <Button onClick={fetchEvidence} disabled={evLoading || !evCaseId.trim()}>
              {evLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Scale className="mr-2 size-4" />}
              Analyze
            </Button>
          </div>
          {evError && <SectionError message={evError} />}
          {evData && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{evData.score}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <ScoreBar score={evData.score} className="flex-1" />
                <span className={`inline-flex rounded-full px-3 py-1 text-lg font-bold ${gradeColor(evData.grade)}`}>
                  {evData.grade}
                </span>
              </div>
              {evData.breakdown && evData.breakdown.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Breakdown</h4>
                  {evData.breakdown.map((b, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{b.category}</span>
                        <span className="text-sm text-muted-foreground">{b.score}/100</span>
                      </div>
                      <ScoreBar score={b.score} />
                      {b.notes && <p className="text-xs text-muted-foreground">{b.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-amber-500" />
            Timeline Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Case ID..."
              value={tlCaseId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTlCaseId(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") fetchTimeline(); }}
              className="flex-1"
            />
            <Button onClick={fetchTimeline} disabled={tlLoading || !tlCaseId.trim()}>
              {tlLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Clock className="mr-2 size-4" />}
              Analyze
            </Button>
          </div>
          {tlError && <SectionError message={tlError} />}
          {!tlLoading && tlData.length === 0 && tlCaseId && !tlError && (
            <EmptyState message="No timeline anomalies found for this case." />
          )}
          {tlData.length > 0 && (
            <div className="relative space-y-0">
              {tlData.map((ev, i) => (
                <div key={ev.id || i} className="flex gap-4 pb-4">
                  <div className="flex flex-col items-center">
                    <div className={`size-3 rounded-full ${severityColor(ev.severity).split(" ")[0]}`} />
                    {i < tlData.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="rounded-lg border p-3 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ev.anomalyType}</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${severityColor(ev.severity)}`}>
                          {ev.severity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ev.eventDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{ev.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// TAB 4: Subjects & Network
// ===================================================================

function SubjectsNetworkTab() {
  const { data: dupData, loading: dupLoading, error: dupError } =
    useFetchData<{ duplicates: DuplicatePair[] }>("/api/ai/duplicate-subjects");
  const { data: netData, loading: netLoading, error: netError } =
    useFetchData<{ hubs: NetworkHub[]; fraudRings: FraudRing[]; componentCount?: number }>("/api/ai/network");
  const { data: riskData, loading: riskLoading, error: riskError } =
    useFetchData<{ subjects: SubjectRisk[] }>("/api/ai/subject-risk");

  return (
    <div className="space-y-6">
      {/* Duplicate Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-amber-500" />
            Potential Duplicate Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dupLoading && <SectionLoader />}
          {dupError && <SectionError message={dupError} />}
          {!dupLoading && !dupError && (!dupData?.duplicates || dupData.duplicates.length === 0) && (
            <EmptyState message="No potential duplicates detected." />
          )}
          {dupData?.duplicates && dupData.duplicates.length > 0 && (
            <div className="space-y-3">
              {dupData.duplicates.slice(0, 10).map((d, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{subjectName(d.subject1)}</span>
                      <ChevronRight className="size-3 text-muted-foreground" />
                      <span>{subjectName(d.subject2)}</span>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {Math.round(d.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.round(d.confidence * 100)}%` }}
                      />
                    </div>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="size-4 text-blue-500" />
            Network Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {netLoading && <SectionLoader />}
          {netError && <SectionError message={netError} />}
          {!netLoading && !netError && netData && (
            <div className="space-y-6">
              {netData.componentCount !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">Network Components: {netData.componentCount}</Badge>
                </div>
              )}

              {/* Hub Entities */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Hub Entities (Most Connected)</h4>
                {(!netData.hubs || netData.hubs.length === 0) ? (
                  <EmptyState message="No highly connected entities found." />
                ) : (
                  <div className="space-y-2">
                    {netData.hubs.slice(0, 10).map((hub) => (
                      <div key={hub.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            hub.type === "subject"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          }`}>
                            {hub.type}
                          </span>
                          <span className="text-sm font-medium">{hub.label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{hub.degree} connections</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fraud Rings */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Detected Fraud Rings</h4>
                {(!netData.fraudRings || netData.fraudRings.length === 0) ? (
                  <EmptyState message="No fraud rings detected." />
                ) : (
                  <div className="space-y-3">
                    {netData.fraudRings.slice(0, 5).map((ring, i) => (
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Risk Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-red-500" />
            Subject Risk Profiles (Top 20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riskLoading && <SectionLoader />}
          {riskError && <SectionError message={riskError} />}
          {!riskLoading && !riskError && (!riskData?.subjects || riskData.subjects.length === 0) && (
            <EmptyState message="No subject risk data available." />
          )}
          {riskData?.subjects && riskData.subjects.length > 0 && (
            <div className="space-y-2">
              {riskData.subjects.slice(0, 20).map((s, i) => (
                <div key={s.id || i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{s.riskScore}</span>
                      <Badge className={
                        s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL"
                          ? "bg-red-500 text-white"
                          : s.riskLevel === "MEDIUM"
                          ? "bg-yellow-500 text-black"
                          : "bg-green-500 text-white"
                      }>
                        {s.riskLevel}
                      </Badge>
                    </div>
                  </div>
                  <ScoreBar score={s.riskScore} />
                  {s.factors && s.factors.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.factors.map((f, j) => (
                        <span key={j} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// TAB 5: Workload & Predictions
// ===================================================================

function WorkloadPredictionsTab() {
  // Investigator Recommender
  const [recCaseType, setRecCaseType] = useState("FRAUD");
  const [recPriority, setRecPriority] = useState("HIGH");
  const [recResults, setRecResults] = useState<InvestigatorRecommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const fetchRecommendation = useCallback(async () => {
    setRecLoading(true);
    setRecError(null);
    try {
      const res = await fetch("/api/ai/recommend-investigator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseType: recCaseType, priority: recPriority }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setRecResults(json.recommendations || []);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Failed");
    } finally {
      setRecLoading(false);
    }
  }, [recCaseType, recPriority]);

  // Workload Balancing
  const { data: workloadData, loading: wlLoading, error: wlError } =
    useFetchData<{ investigators: WorkloadEntry[] }>("/api/ai/workload");

  // Predictions
  const { data: predData, loading: predLoading, error: predError } =
    useFetchData<Prediction>("/api/ai/predictions");

  return (
    <div className="space-y-6">
      {/* Investigator Recommender */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-4 text-violet-500" />
            Investigator Recommender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Case Type</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={recCaseType}
                onChange={(e) => setRecCaseType(e.target.value)}
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
              <label className="text-sm font-medium">Priority</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={recPriority}
                onChange={(e) => setRecPriority(e.target.value)}
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <Button onClick={fetchRecommendation} disabled={recLoading}>
            {recLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Target className="mr-2 size-4" />}
            Get Recommendations
          </Button>
          {recError && <SectionError message={recError} />}
          {recResults.length > 0 && (
            <div className="space-y-2">
              {recResults.slice(0, 3).map((r, i) => (
                <div key={r.investigatorId || i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{r.name}</span>
                    </div>
                    <span className="text-sm font-bold">{Math.round(r.score * 100)}%</span>
                  </div>
                  <ScoreBar score={r.score * 100} />
                  <div className="flex flex-wrap gap-1">
                    {r.reasons.map((reason, j) => (
                      <span key={j} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workload Balancing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-blue-500" />
            Workload Balancing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wlLoading && <SectionLoader />}
          {wlError && <SectionError message={wlError} />}
          {!wlLoading && !wlError && (!workloadData?.investigators || workloadData.investigators.length === 0) && (
            <EmptyState message="No workload data available." />
          )}
          {workloadData?.investigators && workloadData.investigators.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Investigator</th>
                    <th className="pb-2 font-medium">Active Cases</th>
                    <th className="pb-2 font-medium">Workload Score</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadData.investigators.map((inv, i) => (
                    <tr key={inv.investigatorId || i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{inv.name}</td>
                      <td className="py-2">{inv.activeCases}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-right">{inv.workloadScore}</span>
                          <div className="h-2 w-24 rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full transition-all ${scoreBarColor(inv.workloadScore)}`}
                              style={{ width: `${Math.min(100, inv.workloadScore)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2">
                        <Badge className={
                          inv.status === "OVERLOADED"
                            ? "bg-red-500 text-white"
                            : inv.status === "UNDERLOADED"
                            ? "bg-blue-500 text-white"
                            : "bg-green-500 text-white"
                        }>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-green-500" />
            Predictions & Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent>
          {predLoading && <SectionLoader />}
          {predError && <SectionError message={predError} />}
          {!predLoading && !predError && predData && (
            <div className="space-y-6">
              {predData.avgPredictedDuration !== undefined && (
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Avg Predicted Case Duration</p>
                  <p className="text-3xl font-bold">{predData.avgPredictedDuration} <span className="text-base font-normal text-muted-foreground">days</span></p>
                </div>
              )}

              {predData.atRiskCases && predData.atRiskCases.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">At-Risk Cases</h4>
                  {predData.atRiskCases.map((c, i) => (
                    <div key={c.id || i} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Link href={`/dashboard/cases/${c.id}`} className="text-sm font-medium text-primary hover:underline">
                          {c.caseNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c.reason}</p>
                      </div>
                      <Badge className={severityColor(c.risk)}>{c.risk}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {predData.caseloadForecast && predData.caseloadForecast.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Caseload Forecast</h4>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {predData.caseloadForecast.map((f, i) => (
                      <div key={i} className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">{f.period}</p>
                        <p className="text-xl font-bold">{f.predicted}</p>
                        <p className="text-xs text-muted-foreground">cases</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// TAB 6: Claude AI
// ===================================================================

function ClaudeAITab() {
  // Natural Language Search
  const [nlQuery, setNlQuery] = useState("");
  const [nlResults, setNlResults] = useState<NaturalSearchResult[]>([]);
  const [nlFilters, setNlFilters] = useState<Record<string, unknown> | null>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

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

  // Interview Questions
  const [iqCaseType, setIqCaseType] = useState("FRAUD");
  const [iqSubjectRole, setIqSubjectRole] = useState("respondent");
  const [iqDescription, setIqDescription] = useState("");
  const [iqQuestions, setIqQuestions] = useState<InterviewQuestions | null>(null);
  const [iqLoading, setIqLoading] = useState(false);
  const [iqError, setIqError] = useState<string | null>(null);

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

  // Report Generator
  const [reportCaseId, setReportCaseId] = useState("");
  const [reportType, setReportType] = useState("summary");
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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

  // Document Analyzer
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docResult, setDocResult] = useState<{ category: string; tags: string[]; summary: string } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const handleAnalyzeDocument = useCallback(async () => {
    if (!docTitle.trim() || !docContent.trim()) return;
    setDocLoading(true);
    setDocError(null);
    setDocResult(null);
    try {
      const res = await fetch("/api/ai/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: docTitle, content: docContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setDocResult(data);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setDocLoading(false);
    }
  }, [docTitle, docContent]);

  return (
    <div className="space-y-6">
      {/* Natural Language Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4" />
            Natural Language Search
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

          {nlError && <SectionError message={nlError} />}

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

      {/* Interview Question Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            Interview Question Generator
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

          {iqError && <SectionError message={iqError} />}

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

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4" />
            Report Generator
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

          {reportError && <SectionError message={reportError} />}

          {reportContent && (
            <div className="rounded-lg border p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm">
                {reportContent}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Analyzer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-amber-500" />
            Document Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Document Title</label>
            <Input
              placeholder="Enter document title..."
              value={docTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Document Content</label>
            <Textarea
              placeholder="Paste document content here..."
              value={docContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDocContent(e.target.value)}
              rows={5}
            />
          </div>
          <Button onClick={handleAnalyzeDocument} disabled={docLoading || !docTitle.trim() || !docContent.trim()}>
            {docLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Zap className="mr-2 size-4" />}
            Analyze Document
          </Button>

          {docError && <SectionError message={docError} />}

          {docResult && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Category:</span>
                <Badge>{docResult.category}</Badge>
              </div>
              {docResult.tags && docResult.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium mr-1">Tags:</span>
                  {docResult.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
              {docResult.summary && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Summary:</span>
                  <p className="text-sm text-muted-foreground">{docResult.summary}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// TAB 7: Risk Scoring
// ===================================================================

function RiskScoringTab() {
  // Score a Complaint
  const [riskSubject, setRiskSubject] = useState("");
  const [riskDescription, setRiskDescription] = useState("");
  const [riskSource, setRiskSource] = useState("HOTLINE");
  const [riskCategory, setRiskCategory] = useState("FRAUD");
  const [riskAnonymous, setRiskAnonymous] = useState(false);
  const [riskResult, setRiskResult] = useState<RiskScoreResult | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  const handleScoreComplaint = useCallback(async () => {
    if (!riskSubject.trim() || !riskDescription.trim()) return;
    setRiskLoading(true);
    setRiskError(null);
    setRiskResult(null);
    try {
      const res = await fetch("/api/ai/risk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: riskSubject,
          description: riskDescription,
          source: riskSource,
          category: riskCategory,
          anonymous: riskAnonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed");
      setRiskResult(data);
    } catch (err) {
      setRiskError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setRiskLoading(false);
    }
  }, [riskSubject, riskDescription, riskSource, riskCategory, riskAnonymous]);

  // Complaint Deduplication
  const [dedupSubject, setDedupSubject] = useState("");
  const [dedupDescription, setDedupDescription] = useState("");
  const [dedupResult, setDedupResult] = useState<ComplaintDedupResult | null>(null);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [dedupError, setDedupError] = useState<string | null>(null);

  const handleDedup = useCallback(async () => {
    if (!dedupSubject.trim() || !dedupDescription.trim()) return;
    setDedupLoading(true);
    setDedupError(null);
    setDedupResult(null);
    try {
      const res = await fetch("/api/ai/complaint-dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: dedupSubject, description: dedupDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deduplication failed");
      setDedupResult(data);
    } catch (err) {
      setDedupError(err instanceof Error ? err.message : "Deduplication failed");
    } finally {
      setDedupLoading(false);
    }
  }, [dedupSubject, dedupDescription]);

  return (
    <div className="space-y-6">
      {/* Score a Complaint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-red-500" />
            Score a Complaint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Subject name or organization..."
                value={riskSubject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRiskSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Source</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={riskSource}
                onChange={(e) => setRiskSource(e.target.value)}
              >
                <option value="HOTLINE">Hotline</option>
                <option value="EMAIL">Email</option>
                <option value="REFERRAL">Referral</option>
                <option value="AUDIT">Audit</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={riskCategory}
                onChange={(e) => setRiskCategory(e.target.value)}
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
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={riskAnonymous}
                  onChange={(e) => setRiskAnonymous(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                <span>Anonymous complaint</span>
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe the complaint..."
              value={riskDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRiskDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleScoreComplaint} disabled={riskLoading || !riskSubject.trim() || !riskDescription.trim()}>
            {riskLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Shield className="mr-2 size-4" />}
            Calculate Risk Score
          </Button>

          {riskError && <SectionError message={riskError} />}

          {riskResult && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold">{riskResult.score}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <ScoreBar score={riskResult.score} className="flex-1" />
                <Badge className={
                  riskResult.riskLevel === "HIGH" || riskResult.riskLevel === "CRITICAL"
                    ? "bg-red-500 text-white"
                    : riskResult.riskLevel === "MEDIUM"
                    ? "bg-yellow-500 text-black"
                    : "bg-green-500 text-white"
                }>
                  {riskResult.riskLevel}
                </Badge>
              </div>
              {riskResult.factors && riskResult.factors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Risk Factor Breakdown</h4>
                  {riskResult.factors.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{f.factor}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">weight: {f.weight}</span>
                        <span className="font-medium">+{f.contribution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complaint Deduplication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-amber-500" />
            Complaint Deduplication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject</label>
            <Input
              placeholder="Subject name or organization..."
              value={dedupSubject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDedupSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe the complaint to check for duplicates..."
              value={dedupDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDedupDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleDedup} disabled={dedupLoading || !dedupSubject.trim() || !dedupDescription.trim()}>
            {dedupLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
            Check for Duplicates
          </Button>

          {dedupError && <SectionError message={dedupError} />}

          {dedupResult && (
            <div className="space-y-2">
              {(!dedupResult.duplicates || dedupResult.duplicates.length === 0) ? (
                <p className="text-sm text-green-600 font-medium">No potential duplicates found. This appears to be a new complaint.</p>
              ) : (
                <>
                  <p className="text-sm font-medium">{dedupResult.duplicates.length} potential duplicate{dedupResult.duplicates.length !== 1 ? "s" : ""} found</p>
                  {dedupResult.duplicates.map((d, i) => (
                    <div key={d.id || i} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Link href={`/dashboard/cases/${d.id}`} className="text-sm font-medium text-primary hover:underline">
                          {d.caseNumber} - {d.title}
                        </Link>
                        <span className="text-sm font-bold">{Math.round(d.similarity * 100)}% match</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-amber-500 transition-all"
                          style={{ width: `${Math.round(d.similarity * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================================================================
// MAIN PAGE COMPONENT
// ===================================================================

export default function AIInsightsPage() {
  useEffect(() => {
    document.title = "AI Insights | OIG-ITS";
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-sm text-muted-foreground">
            22 AI algorithms for investigation intelligence -- anomalies, case analysis, network detection, workload optimization, and more
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="alerts" className="gap-1.5">
            <AlertTriangle className="size-3.5" />
            Alerts & Anomalies
          </TabsTrigger>
          <TabsTrigger value="case-intel" className="gap-1.5">
            <Layers className="size-3.5" />
            Case Intelligence
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1.5">
            <Scale className="size-3.5" />
            Evidence & Timeline
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-1.5">
            <Network className="size-3.5" />
            Subjects & Network
          </TabsTrigger>
          <TabsTrigger value="workload" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Workload & Predictions
          </TabsTrigger>
          <TabsTrigger value="claude" className="gap-1.5">
            <Bot className="size-3.5" />
            Claude AI
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-1.5">
            <Shield className="size-3.5" />
            Risk Scoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <AlertsAnomaliesTab />
        </TabsContent>

        <TabsContent value="case-intel">
          <CaseIntelligenceTab />
        </TabsContent>

        <TabsContent value="evidence">
          <EvidenceTimelineTab />
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectsNetworkTab />
        </TabsContent>

        <TabsContent value="workload">
          <WorkloadPredictionsTab />
        </TabsContent>

        <TabsContent value="claude">
          <ClaudeAITab />
        </TabsContent>

        <TabsContent value="risk">
          <RiskScoringTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
