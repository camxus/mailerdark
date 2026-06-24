export type Snippet = {
  id: string;
  label: string;
  description: string;
  category: "merge" | "block" | "layout" | "tracking";
  code: string;
};

/** Static snippets — shown in the sidebar regardless of workspace fields. */
export const staticSnippets: Snippet[] = [
  // ─── Tracking / compliance ───────────────────────────────────────────────
  {
    id: "unsubscribe-link",
    label: "Unsubscribe link",
    description: "One-click unsubscribe (auto-injected by Mailerdark, but add it yourself for control over placement)",
    category: "tracking",
    code: `<a href="{{unsubscribe_url}}" style="color:#8a8a8a;font-size:12px;">Unsubscribe</a>`,
  },
  {
    id: "tracking-pixel",
    label: "Open tracking pixel",
    description: "1×1 transparent pixel (auto-injected by Mailerdark before </body>)",
    category: "tracking",
    code: `<img src="{{open_tracking_url}}" width="1" height="1" alt="" style="display:none;" />`,
  },
  // ─── Merge fields ────────────────────────────────────────────────────────
  {
    id: "merge-email",
    label: "{{email}}",
    description: "Subscriber's email address",
    category: "merge",
    code: `{{email}}`,
  },
  // ─── Blocks ──────────────────────────────────────────────────────────────
  {
    id: "block-button",
    label: "CTA button",
    description: "Centred call-to-action button, email-client safe",
    category: "block",
    code: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="center" style="padding:24px 0;">
      <a href="https://example.com"
         style="display:inline-block;background:#0e7c7b;color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:6px;">
        Click here
      </a>
    </td>
  </tr>
</table>`,
  },
  {
    id: "block-divider",
    label: "Divider",
    description: "Horizontal rule with padding",
    category: "block",
    code: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td style="padding:24px 0;">
      <hr style="border:none;border-top:1px solid #e4e2dc;margin:0;" />
    </td>
  </tr>
</table>`,
  },
  {
    id: "block-image",
    label: "Image block",
    description: "Responsive centred image with alt text",
    category: "block",
    code: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="center" style="padding:16px 0;">
      <img src="https://example.com/image.png"
           alt="Description"
           width="600"
           style="display:block;max-width:100%;height:auto;border-radius:6px;" />
    </td>
  </tr>
</table>`,
  },
  {
    id: "block-header",
    label: "Email header",
    description: "Logo + brand name header",
    category: "block",
    code: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="center" style="padding:32px 24px 16px;background:#0e7c7b;">
      <p style="margin:0;font-family:sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
        Your Brand
      </p>
    </td>
  </tr>
</table>`,
  },
  {
    id: "block-footer",
    label: "Email footer",
    description: "Address + unsubscribe footer",
    category: "block",
    code: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="center" style="padding:24px;background:#f6f5f1;">
      <p style="margin:0 0 8px;font-family:sans-serif;font-size:12px;color:#8a8a8a;">
        Your Company · 123 Example Street · City, Country
      </p>
      <p style="margin:0;font-family:sans-serif;font-size:12px;color:#8a8a8a;">
        <a href="{{unsubscribe_url}}" style="color:#8a8a8a;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="https://example.com/privacy" style="color:#8a8a8a;">Privacy policy</a>
      </p>
    </td>
  </tr>
</table>`,
  },
  // ─── Layouts ─────────────────────────────────────────────────────────────
  {
    id: "layout-base",
    label: "Full email skeleton",
    description: "Responsive 600px wrapper with header + body + footer",
    category: "layout",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background:#f6f5f1;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <!-- Wrapper -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:28px 24px;background:#0e7c7b;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Your Brand</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#14171a;">Hello {{email}},</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5358;">
                Your content goes here.
              </p>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <a href="https://example.com"
                       style="display:inline-block;background:#0e7c7b;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:6px;">
                      Get started
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 40px;background:#f6f5f1;border-top:1px solid #e4e2dc;">
              <p style="margin:0;font-size:12px;color:#8a8a8a;">
                © 2026 Your Company · <a href="{{unsubscribe_url}}" style="color:#8a8a8a;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "layout-2col",
    label: "Two-column block",
    description: "Side-by-side columns (stacks on mobile)",
    category: "layout",
    code: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <!-- Left column -->
    <td width="50%" valign="top" style="padding:16px;">
      <p style="margin:0;font-family:sans-serif;font-size:15px;color:#14171a;">Left content</p>
    </td>
    <!-- Right column -->
    <td width="50%" valign="top" style="padding:16px;">
      <p style="margin:0;font-family:sans-serif;font-size:15px;color:#14171a;">Right content</p>
    </td>
  </tr>
</table>`,
  },
];

/** Generates merge-field snippets from workspace custom fields. */
export function fieldSnippets(fields: { key: string; label: string }[]): Snippet[] {
  return fields.map((f) => ({
    id: `merge-${f.key}`,
    label: `{{${f.key}}}`,
    description: f.label,
    category: "merge" as const,
    code: `{{${f.key}}}`,
  }));
}

export const snippetCategories: { id: Snippet["category"]; label: string }[] = [
  { id: "merge", label: "Merge fields" },
  { id: "tracking", label: "Tracking & compliance" },
  { id: "block", label: "Blocks" },
  { id: "layout", label: "Layouts" },
];
