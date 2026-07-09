"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSessionDecisionEmail } from "@/lib/email";
import type { SpeakerStatus } from "@/lib/types";

async function revalidateReviewViews() {
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  revalidatePath("/review");
  revalidatePath("/schedule");
}

/** Approve/reject the session itself (also covers "both" submissions). */
export async function decideSession(sessionId: string, status: "approved" | "rejected", comment: string) {
  const user = await requireRole(["admin", "referee"]);
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, submission_id")
    .eq("id", sessionId)
    .single();
  if (!session) return;

  await admin
    .from("sessions")
    .update({
      status,
      review_comment: comment || null,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  const { data: submission } = await admin
    .from("submissions")
    .select("reference, submitter_name, submitter_email")
    .eq("id", session.submission_id)
    .single();

  if (submission) {
    try {
      await sendSessionDecisionEmail({
        to: submission.submitter_email,
        name: submission.submitter_name,
        reference: submission.reference,
        title: session.title,
        approved: status === "approved",
        comment,
      });
    } catch (err) {
      // Non-fatal — the decision is already saved.
      console.error("sendSessionDecisionEmail failed:", err);
    }
  }

  await revalidateReviewViews();
}

/**
 * Speaker-only submissions (no session) don't have a single row to flip a
 * status on, so "deciding" one bulk-sets every speaker on that submission at
 * once. Individual speakers can still be changed afterwards from the
 * per-speaker buttons.
 */
export async function decideSpeakerOnlySubmission(
  submissionId: string,
  status: "approved" | "rejected",
  comment: string
) {
  const user = await requireRole(["admin", "referee"]);
  const admin = createAdminClient();

  const { data: speakers } = await admin
    .from("speakers")
    .select("id, name")
    .eq("submission_id", submissionId);

  await admin
    .from("speakers")
    .update({
      status,
      review_comment: comment || null,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("submission_id", submissionId);

  const { data: submission } = await admin
    .from("submissions")
    .select("reference, submitter_name, submitter_email")
    .eq("id", submissionId)
    .single();

  if (submission) {
    const title = speakers && speakers.length ? speakers.map((s) => s.name).join(", ") : "your speaker suggestion";
    try {
      await sendSessionDecisionEmail({
        to: submission.submitter_email,
        name: submission.submitter_name,
        reference: submission.reference,
        title,
        approved: status === "approved",
        comment,
      });
    } catch (err) {
      // Non-fatal.
      console.error("sendSessionDecisionEmail failed:", err);
    }
  }

  await revalidateReviewViews();
}

/** Per-speaker approve/confirm/reject/reopen — no email, per product decision. */
export async function decideSpeaker(speakerId: string, status: SpeakerStatus) {
  const user = await requireRole(["admin", "referee"]);
  const admin = createAdminClient();
  await admin
    .from("speakers")
    .update({ status, decided_by: user.id, decided_at: new Date().toISOString() })
    .eq("id", speakerId);
  await revalidateReviewViews();
}

export async function reviseSession(
  sessionId: string,
  patch: { title: string; categoryId: string; sessionTypeId: string }
) {
  await requireRole(["admin", "referee"]);
  const admin = createAdminClient();
  await admin
    .from("sessions")
    .update({ title: patch.title, category_id: patch.categoryId, session_type_id: patch.sessionTypeId })
    .eq("id", sessionId);
  await revalidateReviewViews();
}
