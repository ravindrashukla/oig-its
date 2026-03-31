"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Link2, Paperclip } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EvidenceStatusBadge } from "./EvidenceStatusBadge";
import { EvidenceTypeBadge } from "./EvidenceTypeBadge";
import { CustodyTimeline } from "./CustodyTimeline";
import type { EvidenceWithCustody } from "@/types/evidence";

interface EvidenceCardProps {
  evidence: EvidenceWithCustody;
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const [showCustody, setShowCustody] = useState(false);

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <EvidenceTypeBadge type={evidence.type} showLabel={false} />
            <CardTitle className="truncate text-sm">{evidence.title}</CardTitle>
          </div>
          <EvidenceStatusBadge status={evidence.status} />
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="space-y-1 text-xs text-muted-foreground">
          {evidence.description && (
            <p className="line-clamp-2">{evidence.description}</p>
          )}
          <div className="flex items-center gap-3">
            <EvidenceTypeBadge type={evidence.type} />
            {evidence.source && (
              <span className="flex items-center gap-1 truncate">
                <Link2 className="size-3" />
                {evidence.source}
              </span>
            )}
          </div>
          <p>
            Collected{" "}
            {formatDistanceToNow(new Date(evidence.collectedAt), {
              addSuffix: true,
            })}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-2 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center gap-1">
                  <Paperclip className="size-3" />
                  {evidence._count.files}
                </span>
              </TooltipTrigger>
              <TooltipContent>Attached files</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center gap-1">
                  <Link2 className="size-3" />
                  {evidence._count.chainOfCustody}
                </span>
              </TooltipTrigger>
              <TooltipContent>Custody transfers</TooltipContent>
            </Tooltip>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowCustody(!showCustody)}
          >
            Chain of Custody
            {showCustody ? (
              <ChevronUp className="ml-1 size-3" />
            ) : (
              <ChevronDown className="ml-1 size-3" />
            )}
          </Button>
        </div>

        {showCustody && (
          <div className="rounded-md border bg-muted/30 p-3">
            <CustodyTimeline entries={evidence.chainOfCustody} />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
