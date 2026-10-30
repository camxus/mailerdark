import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecord } from "@/lib/auth/ensure-user";

/**
 * For use in Server Components/layouts under app/w/[workspaceId]. Redirects
 * to sign-in or back to the workspace root if the viewer isn't a member —
 * this is the page-render counterpart to requireWorkspaceAccess, which
 * guards the API routes.
 */
export async function getWorkspaceContext(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  await ensureUserRecord(data.user);

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: data.user.id } },
    include: { workspace: true },
  });

  if (!membership) redirect("/");

  const allMemberships = await db.workspaceMember.findMany({
    where: { userId: data.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    user: { id: data.user.id, email: data.user.email ?? "" },
    workspace: membership.workspace,
    role: membership.role,
    workspaces: allMemberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
    })),
  };
}
