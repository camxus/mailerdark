import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { ensureUserRecord } from "@/lib/auth/ensure-user";

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/sign-in");
  }

  await ensureUserRecord(data.user);

  const membership = await db.workspaceMember.findFirst({
    where: { userId: data.user.id },
    orderBy: { createdAt: "asc" },
  });

  redirect(membership ? `/w/${membership.workspaceId}` : "/onboarding");
}
