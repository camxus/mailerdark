import { createHash } from "crypto";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WorkspaceScope =
  | "subscribers:read"
  | "subscribers:write"
  | "campaigns:read"
  | "campaigns:write"
  | "automations:read"
  | "automations:write"
  | "settings:write";

type AccessResult =
  | { ok: true; actor: { type: "user"; userId: string; role: string } | { type: "api_key"; apiKeyId: string } }
  | { ok: false; response: Response };

function fail(status: number, code: string, message: string): AccessResult {
  return {
    ok: false,
    response: Response.json({ data: null, error: { code, message } }, { status }),
  };
}

/**
 * Authorizes a request against a specific workspace. Supports two callers:
 *  - the dashboard, via the Supabase session cookie (role-based)
 *  - the public API, via `Authorization: Bearer flw_live_...` (scope-based)
 *
 * Usage in a Route Handler:
 *   const auth = await requireWorkspaceAccess(req, params.workspaceId, "subscribers:write");
 *   if (!auth.ok) return auth.response;
 */
export async function requireWorkspaceAccess(
  req: Request,
  workspaceId: string,
  requiredScope: WorkspaceScope
): Promise<AccessResult> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer flw_")) {
    return authorizeApiKey(authHeader.slice("Bearer ".length), workspaceId, requiredScope);
  }

  return authorizeSession(workspaceId, requiredScope);
}

async function authorizeSession(
  workspaceId: string,
  requiredScope: WorkspaceScope
): Promise<AccessResult> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return fail(401, "UNAUTHENTICATED", "Sign in to continue.");
  }

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: data.user.id } },
  });

  if (!membership) {
    return fail(403, "FORBIDDEN", "You don't have access to this workspace.");
  }

  // Only OWNER/ADMIN may change settings; MEMBER is read/write on day-to-day
  // resources (subscribers, campaigns, automations) but not workspace config.
  if (requiredScope === "settings:write" && membership.role === "MEMBER") {
    return fail(403, "FORBIDDEN", "Only workspace admins can change settings.");
  }

  return { ok: true, actor: { type: "user", userId: data.user.id, role: membership.role } };
}

async function authorizeApiKey(
  rawKey: string,
  workspaceId: string,
  requiredScope: WorkspaceScope
): Promise<AccessResult> {
  const hashedKey = createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await db.apiKey.findFirst({
    where: { workspaceId, hashedKey },
  });

  if (!apiKey) {
    return fail(401, "INVALID_API_KEY", "This API key is invalid or has been revoked.");
  }

  if (!apiKey.scopes.includes(requiredScope)) {
    return fail(403, "INSUFFICIENT_SCOPE", `This API key is missing the "${requiredScope}" scope.`);
  }

  await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return { ok: true, actor: { type: "api_key", apiKeyId: apiKey.id } };
}
