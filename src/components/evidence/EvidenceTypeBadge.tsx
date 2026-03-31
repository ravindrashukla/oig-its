"use client";

import {
  FileText,
  Camera,
  Video,
  Headphones,
  Monitor,
  Box,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import type { EvidenceType } from "@/generated/prisma";

const typeConfig: Record<EvidenceType, { label: string; icon: typeof FileText }> = {
  DOCUMENT: { label: "Document", icon: FileText },
  PHOTO: { label: "Photo", icon: Camera },
  VIDEO: { label: "Video", icon: Video },
  AUDIO: { label: "Audio", icon: Headphones },
  DIGITAL: { label: "Digital", icon: Monitor },
  PHYSICAL: { label: "Physical", icon: Box },
  TESTIMONY: { label: "Testimony", icon: MessageCircle },
  OTHER: { label: "Other", icon: HelpCircle },
};

interface EvidenceTypeBadgeProps {
  type: EvidenceType;
  showLabel?: boolean;
}

export function EvidenceTypeBadge({ type, showLabel = true }: EvidenceTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      {showLabel && <span className="text-xs">{config.label}</span>}
    </span>
  );
}
