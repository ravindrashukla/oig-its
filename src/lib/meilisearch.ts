import { MeiliSearch } from "meilisearch";

export const meili = new MeiliSearch({
  host: process.env.MEILI_URL ?? "http://localhost:7700",
  apiKey: process.env.MEILI_MASTER_KEY ?? "oig_search_master_key_2026",
});

// ─── Index names ────────────────────────────────────────

export const INDEXES = {
  cases: "cases",
  evidence: "evidence",
  tasks: "tasks",
  documents: "documents",
} as const;

// ─── Filterable / sortable attributes per index ─────────

const INDEX_SETTINGS: Record<
  string,
  {
    searchableAttributes: string[];
    filterableAttributes: string[];
    sortableAttributes: string[];
    displayedAttributes?: string[];
  }
> = {
  [INDEXES.cases]: {
    searchableAttributes: ["title", "caseNumber", "description", "caseType"],
    filterableAttributes: ["status", "caseType", "priority", "createdById", "organizationId"],
    sortableAttributes: ["createdAt", "updatedAt", "openedAt", "dueDate", "priority", "caseNumber"],
  },
  [INDEXES.evidence]: {
    searchableAttributes: ["title", "description", "source", "type"],
    filterableAttributes: ["status", "type", "caseId"],
    sortableAttributes: ["collectedAt", "createdAt"],
  },
  [INDEXES.tasks]: {
    searchableAttributes: ["title", "description"],
    filterableAttributes: ["status", "priority", "caseId", "assigneeId"],
    sortableAttributes: ["createdAt", "dueDate", "priority"],
  },
  [INDEXES.documents]: {
    searchableAttributes: ["title", "fileName", "mimeType"],
    filterableAttributes: ["status", "caseId", "uploadedBy"],
    sortableAttributes: ["createdAt", "fileSize"],
  },
};

// ─── Configure indexes (idempotent) ─────────────────────

export async function configureIndexes() {
  for (const [name, settings] of Object.entries(INDEX_SETTINGS)) {
    const index = meili.index(name);
    await index.updateSettings({
      searchableAttributes: settings.searchableAttributes,
      filterableAttributes: settings.filterableAttributes,
      sortableAttributes: settings.sortableAttributes,
      ...(settings.displayedAttributes
        ? { displayedAttributes: settings.displayedAttributes }
        : {}),
    });
  }
}

// ─── Sync helpers ───────────────────────────────────────

/** Add or replace documents in an index. */
export async function syncDocuments(
  indexName: string,
  documents: Record<string, unknown>[],
) {
  if (documents.length === 0) return;
  const index = meili.index(indexName);
  await index.addDocuments(documents, { primaryKey: "id" });
}

/** Full sync: push all rows from Prisma into MeiliSearch. */
export async function fullSync(prisma: {
  case: { findMany: (args?: unknown) => Promise<unknown[]> };
  evidenceItem: { findMany: (args?: unknown) => Promise<unknown[]> };
  task: { findMany: (args?: unknown) => Promise<unknown[]> };
  document: { findMany: (args?: unknown) => Promise<unknown[]> };
}) {
  await configureIndexes();

  const [cases, evidence, tasks, documents] = await Promise.all([
    prisma.case.findMany({
      include: {
        assignments: {
          where: { removedAt: null },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }) as Promise<Record<string, unknown>[]>,
    prisma.evidenceItem.findMany({
      include: {
        case: { select: { id: true, caseNumber: true } },
      },
    }) as Promise<Record<string, unknown>[]>,
    prisma.task.findMany({
      include: {
        case: { select: { id: true, caseNumber: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    }) as Promise<Record<string, unknown>[]>,
    prisma.document.findMany({
      include: {
        case: { select: { id: true, caseNumber: true } },
      },
    }) as Promise<Record<string, unknown>[]>,
  ]);

  await Promise.all([
    syncDocuments(INDEXES.cases, cases),
    syncDocuments(INDEXES.evidence, evidence),
    syncDocuments(INDEXES.tasks, tasks),
    syncDocuments(INDEXES.documents, documents),
  ]);

  return { cases: cases.length, evidence: evidence.length, tasks: tasks.length, documents: documents.length };
}
