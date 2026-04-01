import { prisma } from "@/lib/prisma";

// ─── Network Analysis (CM49, CM4, WPN16) ─────────────────────

interface NetworkNode {
  id: string;
  type: "subject" | "case";
  label: string;
  degree: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  type: "subject-case" | "case-case" | "shared-subject";
  label?: string;
}

interface FraudRing {
  members: { id: string; name: string }[];
  linkedCases: { id: string; caseNumber: string }[];
  sharedCaseCount: number;
}

export async function buildInvestigationNetwork(): Promise<{
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  hubs: NetworkNode[];
  components: { id: number; nodeIds: string[] }[];
}> {
  // Load subjects with their cases
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      orgName: true,
      caseSubjects: {
        select: {
          caseId: true,
          case: { select: { id: true, caseNumber: true, title: true } },
        },
      },
    },
  });

  // Load case relationships
  const caseRelations = await prisma.caseRelationship.findMany({
    select: {
      fromCaseId: true,
      toCaseId: true,
      relationship: true,
    },
  });

  // Load cases for labelling
  const cases = await prisma.case.findMany({
    where: { deletedAt: null },
    select: { id: true, caseNumber: true, title: true },
  });

  const caseMap = new Map(cases.map((c) => [c.id, c]));

  // Build adjacency list for degree calculation and components
  const adjacency = new Map<string, Set<string>>();

  function addEdge(a: string, b: string) {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }

  const nodesMap = new Map<string, NetworkNode>();
  const edges: NetworkEdge[] = [];

  // Add case nodes
  for (const c of cases) {
    nodesMap.set(c.id, {
      id: c.id,
      type: "case",
      label: c.caseNumber,
      degree: 0,
    });
  }

  // Add subject nodes and subject-case edges
  for (const s of subjects) {
    const name =
      s.orgName || [s.firstName, s.lastName].filter(Boolean).join(" ") || "Unknown";
    nodesMap.set(s.id, {
      id: s.id,
      type: "subject",
      label: name,
      degree: 0,
    });

    for (const cs of s.caseSubjects) {
      edges.push({
        source: s.id,
        target: cs.caseId,
        type: "subject-case",
      });
      addEdge(s.id, cs.caseId);
    }

    // Shared-subject edges: if a subject appears in multiple cases, link those cases
    if (s.caseSubjects.length > 1) {
      const caseIds = s.caseSubjects.map((cs) => cs.caseId);
      for (let i = 0; i < caseIds.length; i++) {
        for (let j = i + 1; j < caseIds.length; j++) {
          // Avoid duplicate edges by sorting
          const key = [caseIds[i], caseIds[j]].sort().join("-");
          const existsAlready = edges.some(
            (e) =>
              e.type === "shared-subject" &&
              [e.source, e.target].sort().join("-") === key,
          );
          if (!existsAlready) {
            edges.push({
              source: caseIds[i],
              target: caseIds[j],
              type: "shared-subject",
              label: `Shared subject: ${name}`,
            });
            addEdge(caseIds[i], caseIds[j]);
          }
        }
      }
    }
  }

  // Add case-case relationship edges
  for (const rel of caseRelations) {
    edges.push({
      source: rel.fromCaseId,
      target: rel.toCaseId,
      type: "case-case",
      label: rel.relationship,
    });
    addEdge(rel.fromCaseId, rel.toCaseId);
  }

  // Calculate degrees
  for (const [nodeId, neighbors] of adjacency.entries()) {
    const node = nodesMap.get(nodeId);
    if (node) node.degree = neighbors.size;
  }

  const nodes = Array.from(nodesMap.values());

  // Find hubs — nodes with degree >= 3 or top 10 by degree
  const sortedByDegree = [...nodes].sort((a, b) => b.degree - a.degree);
  const hubs = sortedByDegree
    .filter((n) => n.degree >= 2)
    .slice(0, 10);

  // Find connected components using BFS
  const visited = new Set<string>();
  const components: { id: number; nodeIds: string[] }[] = [];
  let compId = 0;

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const component: string[] = [];
    const queue = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      const neighbors = adjacency.get(current);
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
    }

    components.push({ id: compId++, nodeIds: component });
  }

  return { nodes, edges, hubs, components };
}

export async function detectFraudRings(): Promise<FraudRing[]> {
  // Find subjects that share >= 2 cases with another subject
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      orgName: true,
      caseSubjects: {
        select: {
          caseId: true,
          case: { select: { id: true, caseNumber: true } },
        },
      },
    },
  });

  // Map each subject to their set of case IDs
  const subjectCases = new Map<
    string,
    { name: string; caseIds: Set<string>; cases: { id: string; caseNumber: string }[] }
  >();

  for (const s of subjects) {
    const name =
      s.orgName || [s.firstName, s.lastName].filter(Boolean).join(" ") || "Unknown";
    subjectCases.set(s.id, {
      name,
      caseIds: new Set(s.caseSubjects.map((cs) => cs.caseId)),
      cases: s.caseSubjects.map((cs) => cs.case),
    });
  }

  // Build adjacency of subjects sharing >= 2 cases
  const subjectIds = Array.from(subjectCases.keys());
  const ringAdj = new Map<string, Set<string>>();
  const sharedCasesMap = new Map<string, Set<string>>();

  for (let i = 0; i < subjectIds.length; i++) {
    for (let j = i + 1; j < subjectIds.length; j++) {
      const a = subjectCases.get(subjectIds[i])!;
      const b = subjectCases.get(subjectIds[j])!;
      const shared = new Set([...a.caseIds].filter((c) => b.caseIds.has(c)));

      if (shared.size >= 2) {
        if (!ringAdj.has(subjectIds[i])) ringAdj.set(subjectIds[i], new Set());
        if (!ringAdj.has(subjectIds[j])) ringAdj.set(subjectIds[j], new Set());
        ringAdj.get(subjectIds[i])!.add(subjectIds[j]);
        ringAdj.get(subjectIds[j])!.add(subjectIds[i]);

        const pairKey = [subjectIds[i], subjectIds[j]].sort().join("-");
        sharedCasesMap.set(pairKey, shared);
      }
    }
  }

  // Find connected components in the ring adjacency (each component = a ring)
  const visited = new Set<string>();
  const rings: FraudRing[] = [];

  for (const sid of ringAdj.keys()) {
    if (visited.has(sid)) continue;
    const members: string[] = [];
    const queue = [sid];
    visited.add(sid);

    while (queue.length > 0) {
      const current = queue.shift()!;
      members.push(current);
      const neighbors = ringAdj.get(current);
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
    }

    // Collect all linked cases
    const allCases = new Map<string, string>();
    let maxShared = 0;
    for (const m of members) {
      const sc = subjectCases.get(m)!;
      for (const c of sc.cases) {
        allCases.set(c.id, c.caseNumber);
      }
    }

    // Count max shared cases between any pair
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const pairKey = [members[i], members[j]].sort().join("-");
        const shared = sharedCasesMap.get(pairKey);
        if (shared && shared.size > maxShared) maxShared = shared.size;
      }
    }

    rings.push({
      members: members.map((m) => ({
        id: m,
        name: subjectCases.get(m)!.name,
      })),
      linkedCases: Array.from(allCases.entries()).map(([id, caseNumber]) => ({
        id,
        caseNumber,
      })),
      sharedCaseCount: maxShared,
    });
  }

  return rings.sort((a, b) => b.members.length - a.members.length);
}
