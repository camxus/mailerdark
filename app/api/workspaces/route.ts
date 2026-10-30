import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { createWorkspaceSchema } from "@/lib/validation/workspace.schema";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecord } from "@/lib/auth/ensure-user";

export const GET = withErrorHandling(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail(401, "UNAUTHENTICATED", "Sign in to continue.");
  await ensureUserRecord(data.user);

  const memberships = await db.workspaceMember.findMany({
    where: { userId: data.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  return ok(
    memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }))
  );
});

export const POST = withErrorHandling(async (req: Request) => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail(401, "UNAUTHENTICATED", "Sign in to continue.");
  await ensureUserRecord(data.user);

  const body = createWorkspaceSchema.parse(await req.json());

  const existing = await db.workspace.findUnique({ where: { slug: body.slug } });
  if (existing) {
    return fail(409, "SLUG_TAKEN", "That workspace URL is already in use.");
  }

  const workspace = await db.workspace.create({
    data: {
      name: body.name,
      slug: body.slug,
      members: {
        create: { userId: data.user.id, role: "OWNER" },
      },
    },
  });

  return ok({ id: workspace.id, name: workspace.name, slug: workspace.slug, role: "OWNER" }, 201);
});
