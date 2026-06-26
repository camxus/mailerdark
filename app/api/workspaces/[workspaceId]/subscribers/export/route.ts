import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:read");
  if (!auth.ok) return auth.response;

  const { search, groupId, status } = await req.json();

  // Get all field definitions for headers
  const fields = await db.field.findMany({
    where: { workspaceId },
    select: { key: true, label: true },
    orderBy: { key: "asc" },
  });

  const where = {
    workspaceId,
    ...(status ? { status } : {}),
    ...(groupId ? { groups: { some: { groupId } } } : {}),
    ...(search ? { email: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const subscribers = await db.subscriber.findMany({
    where,
    select: { email: true, customFields: true },
    orderBy: { email: "asc" },
  });

  // Build CSV with headers: email + field keys
  const headers = ["email", ...fields.map((f) => f.key)];
  const rows = subscribers.map((s) => {
    const row = [s.email];
    for (const f of fields) {
      const custom = s.customFields as Record<string, unknown> | null;
      const key = f.key;
      const val = custom?.[key];
      row.push(val !== undefined && val !== null ? String(val) : "");
    }
    return row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return ok({ csv });
});