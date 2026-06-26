import { apiGroups, type ApiEndpoint, type ApiParam } from "./spec";

function toOpenApiParams(endpoint: ApiEndpoint) {
  const fromPath = (endpoint.pathParams ?? []).map((p: ApiParam) => ({
    name: p.name,
    in: "path",
    required: true,
    description: p.description,
    schema: { type: p.type },
  }));
  const fromQuery = (endpoint.queryParams ?? []).map((p: ApiParam) => ({
    name: p.name,
    in: "query",
    required: p.required,
    description: p.description,
    schema: { type: p.type },
  }));
  return [...fromPath, ...fromQuery];
}

export function buildOpenApiDocument(baseUrl: string) {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const group of apiGroups) {
    for (const endpoint of group.endpoints) {
      // OpenAPI path params use {param}; ours already match that syntax.
      const fullPath = `/api/workspaces/{workspaceId}${endpoint.path}`;
      paths[fullPath] ??= {};

      paths[fullPath][endpoint.method.toLowerCase()] = {
        operationId: endpoint.id,
        summary: endpoint.summary,
        description: endpoint.description,
        tags: [group.name],
        "x-required-scope": endpoint.scope,
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            description: "The workspace this request operates on.",
            schema: { type: "string" },
          },
          ...toOpenApiParams(endpoint),
        ],
        ...(endpoint.requestBodyExample
          ? {
              requestBody: {
                required: true,
                content: { "application/json": { example: endpoint.requestBodyExample } },
              },
            }
          : {}),
        responses: {
          "200": {
            description: "Success",
            content: { "application/json": { example: { data: endpoint.responseExample, error: null } } },
          },
          "422": {
            description: "Validation error",
            content: { "application/json": { example: { data: null, error: { code: "VALIDATION_ERROR", message: "..." } } } },
          },
        },
      };
    }
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Mailerdark API",
      version: "1.0.0",
      description:
        "Programmatic access to subscribers, groups, fields, campaigns, automations, sending domains, and the AI assistant. " +
        "Authenticate with `Authorization: Bearer flw_live_...` using a key created under Settings → API.",
    },
    servers: [{ url: baseUrl }],
    security: [{ ApiKeyAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "http", scheme: "bearer", bearerFormat: "flw_live_..." },
      },
    },
    paths,
  };
}
