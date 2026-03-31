import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List evaluations for a course ─────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");

  if (!courseId) {
    return Response.json({ error: "courseId query parameter is required" }, { status: 400 });
  }

  // Verify course exists
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  const evaluations = await prisma.courseEvaluation.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  // Hide user info for anonymous evaluations (unless the viewer is the author)
  const data = evaluations.map((evaluation) => {
    if (evaluation.isAnonymous && evaluation.userId !== userId) {
      return {
        id: evaluation.id,
        courseId: evaluation.courseId,
        userId: null,
        rating: evaluation.rating,
        comments: evaluation.comments,
        isAnonymous: true,
        createdAt: evaluation.createdAt,
        user: null,
      };
    }
    return evaluation;
  });

  // Compute aggregate stats
  const ratings = evaluations.map((e) => e.rating);
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    : null;

  void logAudit({
    userId,
    action: "READ",
    entityType: "CourseEvaluation",
    entityId: courseId,
  });

  return Response.json({
    data,
    total: evaluations.length,
    averageRating,
  });
}

// ─── POST: Create an evaluation ─────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { courseId, rating, comments, isAnonymous } = body;

  if (!courseId || typeof courseId !== "string") {
    return Response.json({ error: "courseId is required" }, { status: 422 });
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return Response.json({ error: "rating must be an integer between 1 and 5" }, { status: 422 });
  }

  // Verify course exists
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  // Check for existing evaluation by this user for this course
  const existing = await prisma.courseEvaluation.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  if (existing) {
    return Response.json(
      { error: "You have already evaluated this course" },
      { status: 409 },
    );
  }

  const evaluation = await prisma.courseEvaluation.create({
    data: {
      courseId,
      userId,
      rating,
      comments: comments || null,
      isAnonymous: isAnonymous === true,
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "CourseEvaluation",
    entityId: evaluation.id,
    metadata: { courseId, rating, isAnonymous: isAnonymous === true },
  });

  return Response.json(evaluation, { status: 201 });
}
