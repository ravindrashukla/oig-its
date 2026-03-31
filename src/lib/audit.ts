import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/generated/prisma";

export interface FieldChange {
  old: unknown;
  new: unknown;
}

interface AuditEntry {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Writes an audit log entry. Never throws — errors are logged to stderr.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: (entry.metadata as any) ?? undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
