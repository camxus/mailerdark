export type CampaignTemplate = {
  id: string;
  name: string;
  description: string;
  category: "welcome" | "newsletter" | "promotional" | "transactional" | "reengagement";
  subject: string;
  html: string;
};

const WRAPPER = (content: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background:#f6f5f1;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07);">
        ${content}
        <tr><td align="center" style="padding:20px 40px 28px;background:#f6f5f1;border-top:1px solid #e4e2dc;">
          <p style="margin:0;font-size:12px;color:#9a9a9a;">
            © 2026 {{company_name}} &nbsp;·&nbsp;
            <a href="{{unsubscribe_url}}" style="color:#9a9a9a;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const campaignTemplates: CampaignTemplate[] = [
  {
    id: "welcome-simple",
    name: "Simple welcome",
    description: "Clean, minimal welcome for new subscribers",
    category: "welcome",
    subject: "Welcome, {{first_name}} 👋",
    html: WRAPPER(`
        <tr><td style="padding:36px 40px 12px;">
          <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#14171a;letter-spacing:-.5px;">
            Welcome aboard, {{first_name}}!
          </h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4b5358;">
            We're really glad you joined. Here's what you can expect from us — helpful tips,
            product updates, and the occasional interesting read. No noise, ever.
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr><td>
              <a href="{{cta_url}}"
                style="display:inline-block;background:#0e7c7b;color:#fff;font-size:15px;font-weight:600;
                       text-decoration:none;padding:13px 30px;border-radius:6px;">
                Get started →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px 36px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
            Questions? Just reply to this email — we read every one.
          </p>
        </td></tr>`),
  },
  {
    id: "newsletter-digest",
    name: "Weekly digest",
    description: "Curated roundup with a featured article and short links",
    category: "newsletter",
    subject: "This week in {{topic}} — {{date}}",
    html: WRAPPER(`
        <tr><td style="padding:32px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9a9a9a;">WEEKLY DIGEST</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:800;color:#14171a;letter-spacing:-.5px;">The Week in {{topic}}</h1>
          <hr style="border:none;border-top:2px solid #0e7c7b;margin:0 0 24px;width:48px;text-align:left;" />
        </td></tr>
        <tr><td style="padding:0 40px 28px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0e7c7b;">FEATURED</p>
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#14171a;">Your article headline goes here</h2>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5358;">
            A two or three sentence summary of what the article covers and why it matters to
            your reader. Keep it punchy — you want them to click through.
          </p>
          <a href="{{article_url}}" style="font-size:14px;font-weight:600;color:#0e7c7b;text-decoration:none;">Read the full article →</a>
        </td></tr>`),
  },
  {
    id: "promo-sale",
    name: "Sale announcement",
    description: "Bold promotional email with discount code and CTA",
    category: "promotional",
    subject: "{{discount_percent}}% off — today only ⚡",
    html: WRAPPER(`
        <tr><td align="center" style="padding:40px 40px 28px;background:#0e7c7b;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.7);">LIMITED TIME OFFER</p>
          <h1 style="margin:0 0 12px;font-size:48px;font-weight:800;color:#fff;letter-spacing:-1px;">{{discount_percent}}% OFF</h1>
          <p style="margin:0 0 24px;font-size:16px;color:rgba(255,255,255,.85);">Everything in our store. Today only.</p>
          <div style="display:inline-block;background:rgba(0,0,0,.2);border-radius:6px;padding:10px 20px;">
            <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,.6);">USE CODE</p>
            <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:.1em;color:#fff;">{{promo_code}}</p>
          </div>
        </td></tr>
        <tr><td style="padding:32px 40px 16px;">
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4b5358;">
            Hi {{first_name}}, you've been such a loyal customer — we wanted to give you first
            access to our biggest sale of the year. Don't wait, this code expires at midnight.
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr><td>
              <a href="{{shop_url}}"
                style="display:inline-block;background:#0e7c7b;color:#fff;font-size:16px;font-weight:700;
                       text-decoration:none;padding:14px 36px;border-radius:6px;">
                Shop the sale →
              </a>
            </td></tr>
          </table>
        </td></tr>`),
  },
  {
    id: "reengagement-winback",
    name: "Win-back",
    description: "Re-engage subscribers who haven't opened in a while",
    category: "reengagement",
    subject: "We miss you, {{first_name}} 👋",
    html: WRAPPER(`
        <tr><td style="padding:36px 40px 28px;">
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#14171a;">It's been a while, {{first_name}}</h1>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#4b5358;">
            We noticed you haven't been around lately, and we get it — life gets busy.
            But a lot has changed since you last checked in, and we'd love to catch you up.
          </p>
          <div style="background:#f6f5f1;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0e7c7b;">WHAT'S NEW</p>
            <ul style="margin:0;padding:0 0 0 20px;font-size:15px;line-height:1.8;color:#4b5358;">
              <li>Update or feature #1</li>
              <li>Update or feature #2</li>
              <li>Update or feature #3</li>
            </ul>
          </div>
          <a href="{{cta_url}}"
            style="display:inline-block;background:#0e7c7b;color:#fff;font-size:15px;font-weight:600;
                   text-decoration:none;padding:13px 30px;border-radius:6px;">
            Come back and explore →
          </a>
          <p style="margin:20px 0 0;font-size:13px;color:#9a9a9a;">
            If you'd rather not hear from us,
            <a href="{{unsubscribe_url}}" style="color:#9a9a9a;">unsubscribe here</a>
            and we won't bother you again.
          </p>
        </td></tr>`),
  },
];

export const templateCategories = [
  { id: "welcome", label: "Welcome" },
  { id: "newsletter", label: "Newsletter" },
  { id: "promotional", label: "Promotional" },
  { id: "reengagement", label: "Re-engagement" },
] as const;