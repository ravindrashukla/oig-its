"use client";

import { use, useState } from "react";
import {
  ExternalLink,
  Plus,
  Building2,
  Mail,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { useReferrals, useCreateReferral } from "@/hooks/useReferrals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const agencyTypeColors: Record<string, string> = {
  FEDERAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  STATE: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  LOCAL: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  REGULATORY: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  LAW_ENFORCEMENT: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  DECLINED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CaseReferralsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    agencyName: "",
    agencyType: "",
    contactName: "",
    contactEmail: "",
    referralDate: "",
    reason: "",
    status: "PENDING",
    outcome: "",
  });

  const { data, isLoading, error } = useReferrals(caseId);
  const createReferral = useCreateReferral(caseId);

  const referrals = data?.data ?? [];

  function handleSubmit() {
    if (!formData.agencyName || !formData.agencyType || !formData.reason) return;
    createReferral.mutate(
      {
        agencyName: formData.agencyName,
        agencyType: formData.agencyType,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        referralDate: formData.referralDate || undefined,
        reason: formData.reason,
        status: formData.status || undefined,
        outcome: formData.outcome || undefined,
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          setFormData({
            agencyName: "",
            agencyType: "",
            contactName: "",
            contactEmail: "",
            referralDate: "",
            reason: "",
            status: "PENDING",
            outcome: "",
          });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          {error.message || "Failed to load referrals."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {referrals.length} referral{referrals.length !== 1 ? "s" : ""}
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" />
          New Referral
        </Button>
      </div>

      {referrals.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <ExternalLink className="mx-auto size-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-sm font-medium">No referrals</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No referrals have been created for this case yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {referrals.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{r.agencyName}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-transparent text-[10px]",
                      statusColors[r.status] || statusColors.PENDING,
                    )}
                  >
                    {formatEnum(r.status)}
                  </Badge>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "border-transparent text-[10px]",
                    agencyTypeColors[r.agencyType] || agencyTypeColors.OTHER,
                  )}
                >
                  {formatEnum(r.agencyType)}
                </Badge>

                {(r.contactName || r.contactEmail) && (
                  <div className="space-y-1">
                    {r.contactName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="size-3" />
                        <span>{r.contactName}</span>
                      </div>
                    )}
                    {r.contactEmail && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="size-3" />
                        <span>{r.contactEmail}</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    Reason
                  </p>
                  <p className="text-sm line-clamp-2">{r.reason}</p>
                </div>

                {r.outcome && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      Outcome
                    </p>
                    <p className="text-sm line-clamp-2">{r.outcome}</p>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Referred {format(new Date(r.referralDate), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Referral Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="r-agency">Agency Name</Label>
                <Input
                  id="r-agency"
                  placeholder="Agency name"
                  value={formData.agencyName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      agencyName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Agency Type</Label>
                <Select
                  value={formData.agencyType}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, agencyType: v ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "FEDERAL",
                      "STATE",
                      "LOCAL",
                      "REGULATORY",
                      "LAW_ENFORCEMENT",
                      "OTHER",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatEnum(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="r-contact">Contact Name</Label>
                <Input
                  id="r-contact"
                  placeholder="Contact person"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-email">Contact Email</Label>
                <Input
                  id="r-email"
                  type="email"
                  placeholder="email@agency.gov"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactEmail: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-reason">Reason</Label>
              <Textarea
                id="r-reason"
                placeholder="Reason for referral..."
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, status: v ?? "PENDING" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {["PENDING", "SENT", "ACCEPTED", "DECLINED", "COMPLETED"].map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {formatEnum(s)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-date">Referral Date</Label>
                <Input
                  id="r-date"
                  type="date"
                  value={formData.referralDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      referralDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-outcome">Outcome</Label>
              <Textarea
                id="r-outcome"
                placeholder="Outcome of referral (if known)..."
                value={formData.outcome}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, outcome: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.agencyName ||
                !formData.agencyType ||
                !formData.reason ||
                createReferral.isPending
              }
            >
              {createReferral.isPending ? "Saving..." : "Create Referral"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
