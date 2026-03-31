import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  const accessFilter = getCaseAccessFilter(role, userId);

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      organization: {
        select: { id: true, name: true, shortName: true },
      },
      assignments: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
      },
      subjects: {
        include: {
          subject: {
            include: {
              violations: { where: { caseId } },
              subjectActions: { where: { caseId } },
              financialResults: { where: { caseId } },
            },
          },
        },
      },
      evidenceItems: {
        include: {
          chainOfCustody: {
            include: {
              fromUser: {
                select: { id: true, firstName: true, lastName: true },
              },
              toUser: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { occurredAt: "asc" },
          },
          files: true,
        },
      },
      documents: {
        select: {
          id: true,
          title: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          status: true,
          uploadedBy: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      tasks: {
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      notes: {
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
      workflowInstances: {
        include: {
          definition: {
            select: { id: true, name: true, type: true },
          },
          actions: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      violations: {
        include: {
          subject: {
            select: { id: true, firstName: true, lastName: true, orgName: true, type: true },
          },
        },
      },
      financialResults: {
        include: {
          subject: {
            select: { id: true, firstName: true, lastName: true, orgName: true, type: true },
          },
        },
      },
      techniques: {
        orderBy: { date: "asc" },
      },
      referrals: {
        orderBy: { referralDate: "asc" },
      },
      subjectActions: {
        include: {
          subject: {
            select: { id: true, firstName: true, lastName: true, orgName: true, type: true },
          },
        },
      },
      relationshipsFrom: {
        include: {
          toCase: {
            select: { id: true, caseNumber: true, title: true },
          },
        },
      },
      relationshipsTo: {
        include: {
          fromCase: {
            select: { id: true, caseNumber: true, title: true },
          },
        },
      },
    },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  void logAudit({
    userId,
    action: "EXPORT",
    entityType: "Case",
    entityId: caseId,
    metadata: { reportType: "full", caseNumber: caseRecord.caseNumber },
  });

  return Response.json(caseRecord);
}
