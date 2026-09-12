import type { VisitorData } from "@/lib/types";

/**
 * Sends the notification email via Resend.
 *
 * Server-only. Plain fetch again — Resend's send endpoint is one POST.
 */

const ENDPOINT = "https://api.resend.com/emails";

/**
 * Escapes user-supplied text before it goes into the HTML email.
 *
 * This matters: the grievance field is free text typed by a stranger on the
 * internet, and it is about to be interpolated into an HTML document that
 * lands in your inbox. Without this, anything from a broken layout to an
 * injected link is possible. Never interpolate untrusted input into markup
 * unescaped — the fact that it's "just an email to myself" is not a defence.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function buildHtml(data: VisitorData, submittedAt: Date): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e2725;color:#7c8d88;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;width:110px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1e2725;color:#e8f0ed;font-size:15px;vertical-align:top;">${value}</td>
    </tr>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#070a09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#0b0f0e;border:1px solid #2a3532;border-radius:8px;">
      <tr>
        <td style="padding:28px 28px 20px;border-bottom:1px solid #1e2725;">
          <div style="color:#34e0b0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;">Incoming request</div>
          <div style="color:#e8f0ed;font-size:24px;font-weight:800;letter-spacing:-0.02em;margin-top:8px;">Someone needs your help</div>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 28px 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            ${row("Name", escapeHtml(data.name))}
            ${row("Age", escapeHtml(data.age))}
            ${row("Location", escapeHtml(data.location))}
            ${row("Email", `<a href="mailto:${encodeURIComponent(data.email)}" style="color:#34e0b0;text-decoration:none;">${escapeHtml(data.email)}</a>`)}
            ${row("Received", escapeHtml(formatTimestamp(submittedAt)))}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 28px;">
          <div style="color:#7c8d88;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;">What they said</div>
          <div style="background:#121816;border-left:2px solid #34e0b0;border-radius:4px;padding:16px;color:#e8f0ed;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.grievance)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;color:#4a5854;font-size:12px;">
          Sent automatically by VERDIGRIS. Reply directly to reach ${escapeHtml(data.name)}.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Plain-text alternative. Some clients prefer it, and it keeps the message
 *  out of spam filters that distrust HTML-only mail. */
function buildText(data: VisitorData, submittedAt: Date): string {
  return [
    "SOMEONE NEEDS YOUR HELP",
    "",
    `Name:     ${data.name}`,
    `Age:      ${data.age}`,
    `Location: ${data.location}`,
    `Email:    ${data.email}`,
    `Received: ${formatTimestamp(submittedAt)}`,
    "",
    "What they said:",
    data.grievance,
  ].join("\n");
}

export async function sendNotification(
  data: VisitorData,
  submittedAt: Date,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM ?? "VERDIGRIS <onboarding@resend.dev>";

  if (!apiKey || !to) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        // Replying to the notification reaches the visitor directly.
        reply_to: data.email,
        subject: `🦸 Someone Needs Your Help — ${data.name}, ${data.location}`,
        html: buildHtml(data, submittedAt),
        text: buildText(data, submittedAt),
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
