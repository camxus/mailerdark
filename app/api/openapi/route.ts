import { buildOpenApiDocument } from "@/lib/openapi/build-document";

export async function GET(req: Request) {
  const baseUrl = new URL(req.url).origin;
  const document = buildOpenApiDocument(baseUrl);
  return Response.json(document);
}
