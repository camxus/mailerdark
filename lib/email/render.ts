import { buildOpenTrackingUrl, buildUnsubscribeUrl, buildClickTrackingUrl } from "@/lib/tracking/sign";

type MergeSubscriber = { email: string; customFields: Record<string, unknown> };

const MERGE_FIELD_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
const ANCHOR_HREF_PATTERN = /(<a\s+(?:[^>]*?\s)?href=["'])([^"']+)(["'][^>]*>)/gi;

export function substituteMergeFields(template: string, subscriber: MergeSubscriber): string {
  return template.replace(MERGE_FIELD_PATTERN, (_match, key: string) => {
    if (key === "email") return subscriber.email;
    const value = subscriber.customFields?.[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/**
 * Rewrites every <a href="..."> in the rendered HTML to route through the
 * click-tracking redirect. Skips mailto:, tel:, in-page anchors, and the
 * unsubscribe link itself (re-tracking a click on "unsubscribe" as engagement
 * would be misleading).
 */
function rewriteLinksForClickTracking(html: string, jobId: string): string {
  return html.replace(ANCHOR_HREF_PATTERN, (match, prefix: string, href: string, suffix: string) => {
    const isTrackable =
      /^https?:\/\//i.test(href) && !href.includes("/t/unsubscribe/") && !href.includes("/t/click/");
    if (!isTrackable) return match;
    return `${prefix}${buildClickTrackingUrl(jobId, href)}${suffix}`;
  });
}

function injectTrackingAndUnsubscribe(html: string, jobId: string): string {
  const pixel = `<img src="${buildOpenTrackingUrl(jobId)}" width="1" height="1" alt="" style="display:none" />`;
  const unsubscribe = `<p style="font-size:12px;color:#8a8a8a;margin-top:24px;">Don't want these emails? <a href="${buildUnsubscribeUrl(
    jobId
  )}" style="color:#8a8a8a;">Unsubscribe</a></p>`;
  const footer = `${unsubscribe}${pixel}`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${footer}</body>`) : `${html}${footer}`;
}

/**
 * Renders a campaign's subject + body for one subscriber. Pass `jobId` only
 * once an EmailJob actually exists (real send / test send) — preview
 * rendering has no job to attach tracking links to, so it's skipped there.
 */
export function renderCampaignEmail(input: {
  subject: string;
  htmlContent: string;
  subscriber: MergeSubscriber;
  jobId?: string;
}): { subject: string; html: string } {
  const subject = substituteMergeFields(input.subject, input.subscriber);
  let html = substituteMergeFields(input.htmlContent, input.subscriber);

  if (input.jobId) {
    html = rewriteLinksForClickTracking(html, input.jobId);
    html = injectTrackingAndUnsubscribe(html, input.jobId);
  }

  return { subject, html };
}
