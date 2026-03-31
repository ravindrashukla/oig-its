import type { UserRole } from "@/generated/prisma";

export type Permission =
  | "case:create"
  | "case:read"
  | "case:update"
  | "case:delete"
  | "case:assign"
  | "case:close"
  | "evidence:create"
  | "evidence:read"
  | "evidence:update"
  | "evidence:delete"
  | "document:create"
  | "document:read"
  | "document:update"
  | "document:delete"
  | "task:create"
  | "task:read"
  | "task:update"
  | "task:delete"
  | "user:create"
  | "user:read"
  | "user:update"
  | "user:delete"
  | "report:create"
  | "report:read"
  | "report:run"
  | "audit:read"
  | "settings:read"
  | "settings:update"
  | "training:read"
  | "training:create"
  | "training:update"
  | "training:assign";

const permissions: Record<UserRole, Set<Permission>> = {
  ADMIN: new Set<Permission>([
    "case:create", "case:read", "case:update", "case:delete", "case:assign", "case:close",
    "evidence:create", "evidence:read", "evidence:update", "evidence:delete",
    "document:create", "document:read", "document:update", "document:delete",
    "task:create", "task:read", "task:update", "task:delete",
    "user:create", "user:read", "user:update", "user:delete",
    "report:create", "report:read", "report:run",
    "audit:read",
    "settings:read", "settings:update",
    "training:read", "training:create", "training:update", "training:assign",
  ]),

  SUPERVISOR: new Set<Permission>([
    "case:create", "case:read", "case:update", "case:assign", "case:close",
    "evidence:create", "evidence:read", "evidence:update",
    "document:create", "document:read", "document:update",
    "task:create", "task:read", "task:update",
    "user:read",
    "report:create", "report:read", "report:run",
    "audit:read",
    "settings:read",
    "training:read", "training:create", "training:update", "training:assign",
  ]),

  INVESTIGATOR: new Set<Permission>([
    "case:create", "case:read", "case:update",
    "evidence:create", "evidence:read", "evidence:update",
    "document:create", "document:read", "document:update",
    "task:create", "task:read", "task:update",
    "user:read",
    "report:read", "report:run",
    "training:read", "training:update",
  ]),

  ANALYST: new Set<Permission>([
    "case:read",
    "evidence:read",
    "document:read",
    "task:read",
    "user:read",
    "report:create", "report:read", "report:run",
    "training:read",
  ]),

  AUDITOR: new Set<Permission>([
    "case:read",
    "evidence:read",
    "document:read",
    "task:read",
    "user:read",
    "report:read", "report:run",
    "audit:read",
    "training:read",
  ]),

  READONLY: new Set<Permission>([
    "case:read",
    "document:read",
    "task:read",
    "training:read",
  ]),
};

export function checkPermission(role: UserRole, permission: Permission): boolean {
  return permissions[role]?.has(permission) ?? false;
}

/**
 * Returns a Prisma `where` filter that restricts case visibility based on role.
 * ADMIN / SUPERVISOR / AUDITOR / ANALYST see all cases.
 * INVESTIGATOR sees only cases assigned to them.
 * READONLY sees only cases assigned to them.
 *
 * Returns `any` to avoid type conflicts between the two Prisma generation outputs
 * (src/generated/prisma vs node_modules/.prisma/client).
 */
export function getCaseAccessFilter(
  role: UserRole,
  userId: string,
): any {
  const unrestricted: UserRole[] = ["ADMIN", "SUPERVISOR", "AUDITOR", "ANALYST"];
  if (unrestricted.includes(role)) return {};

  return {
    assignments: {
      some: { userId },
    },
  };
}
