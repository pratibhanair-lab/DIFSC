import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "DIFSC 2026 <onboarding@resend.dev>";

const wrapper = (title: string, body: string) => `
<div style="font-family:'IBM Plex Sans',Arial,sans-serif;background:#F4F3EE;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #E6E4DC;border-radius:16px;overflow:hidden;">
    <div style="background:#17805A;height:6px;"></div>
    <div style="padding:32px;">
      <div style="font-size:12px;letter-spacing:.08em;color:#17805A;font-weight:600;text-transform:uppercase;">DIFSC 2026 &middot; 20th Edition</div>
      <h1 style="font-size:22px;margin:12px 0 16px;color:#1B241F;">${title}</h1>
      <div style="font-size:14.5px;line-height:1.6;color:#1B241F;">${body}</div>
      <p style="margin-top:28px;font-size:12.5px;color:#5E6B63;">Dubai International Food Safety Conference &middot; Nov 16&ndash;18, 2026</p>
    </div>
  </div>
</div>`;

export async function sendSubmissionConfirmation(opts: {
  to: string;
  name: string;
  reference: string;
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `We received your suggestion — ${opts.reference}`,
    html: wrapper(
      "Suggestion received",
      `<p>Thank you, ${opts.name}. Your session/speaker suggestion for the 20th Dubai International Food Safety Conference has been sent to the review committee.</p>
       <p>Your reference number is <strong>${opts.reference}</strong> — keep it handy if you follow up with us.</p>
       <p>We'll email you again as soon as a decision has been made.</p>`
    ),
  });
  // The Resend SDK reports API-level failures (bad "from", unverified domain,
  // sandbox recipient restrictions, etc.) in `error` rather than throwing.
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function sendSessionDecisionEmail(opts: {
  to: string;
  name: string;
  reference: string;
  title: string;
  approved: boolean;
  comment?: string | null;
}) {
  const verb = opts.approved ? "approved" : "not selected";
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.approved ? "Approved" : "Update"}: ${opts.title} (${opts.reference})`,
    html: wrapper(
      opts.approved ? "Your suggestion was approved" : "An update on your suggestion",
      `<p>Hi ${opts.name},</p>
       <p>Your suggestion <strong>${opts.title}</strong> (ref. ${opts.reference}) has been <strong>${verb}</strong> by the programme committee.</p>
       ${opts.comment ? `<p style="background:#FAF9F5;border-radius:10px;padding:14px;">${opts.comment}</p>` : ""}
       ${opts.approved ? "<p>We'll be in touch with scheduling details closer to the conference.</p>" : "<p>Thank you for contributing to the programme — we hope you'll submit again in the future.</p>"}`
    ),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
