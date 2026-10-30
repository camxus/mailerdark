import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client. Reads/writes the auth cookie on the current
 * request, so call this fresh inside every Server Component, Route Handler,
 * or Server Action — never module-level cache it.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no response to attach to.
            // Safe to ignore as long as middleware.ts is refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Service-role Supabase client. Bypasses Row Level Security — only use this
 * from trusted server contexts (webhooks, workers, admin actions), never
 * expose it to a request driven directly by untrusted user input without an
 * explicit authorization check first.
 */
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
