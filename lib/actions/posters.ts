"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPosterConfirmation, sendPosterDecisionEmail } from "@/lib/email";

import { postersOpen, POSTERS_CLOSED_MESSAGE } from "@/lib/submission-config";

const ABSTRACT_WORD_LIMIT = 300;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type SubmitPosterInput = {
  presenterName: string;
  affiliation: string;
  email: string;
  phone: string;
  title: string;
  abstract: string;
  categoryId: string;
};

export type SubmitPosterResult =
  | { ok: true; reference: string; firstName: string }
  | { ok: false; error: string };

async function revalidatePosterViews() {
  revalidatePath("/review");
  revalidatePath("/posters/approved");
  revalidatePath("/admin/posters");
  revalidatePath("/admin");
}

export async function submitPoster(payload: SubmitPosterInput): Promise<SubmitPosterResult> {
  if (!postersOpen()) return { ok: false, error: POSTERS_CLOSED_MESSAGE };

  const presenterName = payload.presenterName.trim();
  const email = payload.email.trim();
  const title = payload.title.trim();
  const abstract = payload.abstract.trim();

  if (!presenterName || !email) return { ok: false, error: "Please enter the presenter's name and email." };
  if (!title) return { ok: false, error: "Please enter a poster title." };
  if (!abstract) return { ok: false, error: "Please enter an abstract." };
  if (!payload.categoryId) return { ok: false, error: "Please select a category." };
  if (wordCount(abstract) > ABSTRACT_WORD_LIMIT) {
    return { ok: false, error: `The abstract must be ${ABSTRACT_WORD_LIMIT} words or fewer.` };
  }

  const admin = createAdminClient();

  const { data: reference, error: refError } = await admin.rpc("next_poster_reference");
  if (refError || !reference) {
    return { ok: false, error: "Something went wrong generating a reference number. Please try again." };
  }

  const { error: insertError } = await admin.from("poster_submissions").insert({
    reference,
    presenter_name: presenterName,
    affiliation: payload.affiliation.trim() || null,
    email,
    phone: payload.phone.trim() || null,
    title,
    abstract,
    category_id: payload.categoryId,
  });

  if (insertError) {
    return { ok: false, error: "Something went wrong saving your poster submission. Please try again." };
  }

  try {
    await sendPosterConfirmation({ to: email, name: presenterName, reference });
  } catch (err) {
    console.error("sendPosterConfirmation failed:", err);
  }

  await revalidatePosterViews();

  return { ok: true, reference, firstName: presenterName.split(" ")[0] };
}

export async function decidePoster(posterId: string, status: "approved" | "rejected", comment: string) {
  const staff = await requireRole(["admin", "referee"]);
  const admin = createAdminClient();

  const { data: poster } = await admin
    .from("poster_submissions")
    .select("id, reference, presenter_name, email, title")
    .eq("id", posterId)
    .single();
  if (!poster) return;

  await admin
    .from("poster_submissions")
    .update({
      status,
      review_comment: comment || null,
      decided_by: staff.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", posterId);

  try {
    await sendPosterDecisionEmail({
      to: poster.email,
      name: poster.presenter_name,
      reference: poster.reference,
      title: poster.title,
      approved: status === "approved",
      comment,
    });
  } catch (err) {
    console.error("sendPosterDecisionEmail failed:", err);
  }

  await revalidatePosterViews();
}
