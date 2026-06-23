import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/db";

/**
 * The SQL trigger in supabase/sql/001_init.sql keeps public.users in sync
 * with auth.users automatically. This is a defensive fallback for any path
 * that runs before that migration has been applied, or in local dev before
 * the trigger fires — cheap to call, a no-op once the row already matches.
 */
export async function ensureUserRecord(user: User) {
  await db.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? "",
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
    update: { email: user.email ?? undefined },
  });
}
