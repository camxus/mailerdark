import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { z } from "zod";

type RouteParams = { params: Promise<{ workspaceId: string }> };

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:read");
  if (!auth.ok) return auth.response;

  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return ok(
    members.map((m) => ({ userId: m.userId, email: m.user.email, role: m.role }))
  );
});

/**
 * Note: this adds an *existing* Mailerdark user to the workspace. A full
 * email-invite flow for people who don't have an account yet depends on
 * the email-sending system from CHECKLIST.md Phase 5, and is intentionally
 * deferred until that's in place.
 */
export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const body = addMemberSchema.parse(await req.json());

  const user = await db.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return fail(
      404,
      "USER_NOT_FOUND",
      "No Mailerdark account exists for this email yet. They need to sign up first."
    );
  }

  const member = await db.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    create: { workspaceId, userId: user.id, role: body.role },
    update: { role: body.role },
  });

  return ok({ userId: member.userId, email: user.email, role: member.role }, 201);
});
