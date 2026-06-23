import type { ApiEndpoint } from "@/lib/openapi/spec";

export function buildSnippets(input: {
  endpoint: ApiEndpoint;
  url: string;
  apiKey: string;
  body: string | null;
}) {
  const { endpoint, url, apiKey, body } = input;
  const keyDisplay = apiKey || "YOUR_API_KEY";

  const curl = [
    `curl -X ${endpoint.method} "${url}" \\`,
    `  -H "Authorization: Bearer ${keyDisplay}" \\`,
    `  -H "Content-Type: application/json"`,
    body ? ` \\\n  -d '${body.replace(/\n\s*/g, " ")}'` : "",
  ].join("");

  const node = `const res = await fetch("${url}", {
  method: "${endpoint.method}",
  headers: {
    "Authorization": "Bearer ${keyDisplay}",
    "Content-Type": "application/json",
  },${body ? `\n  body: JSON.stringify(${body}),` : ""}
});
const { data, error } = await res.json();`;

  const python = `import requests

response = requests.request(
    "${endpoint.method}",
    "${url}",
    headers={
        "Authorization": "Bearer ${keyDisplay}",
        "Content-Type": "application/json",
    },${body ? `\n    json=${pythonizeJson(body)},` : ""}
)
data = response.json()`;

  return { curl, node, python };
}

function pythonizeJson(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed)
      .replace(/:true/g, ": True")
      .replace(/:false/g, ": False")
      .replace(/:null/g, ": None");
  } catch {
    return body;
  }
}
