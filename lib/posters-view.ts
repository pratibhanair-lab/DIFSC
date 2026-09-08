import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PosterStatus } from "@/lib/types";

export type PosterView = {
  id: string;
  reference: string;
  presenterName: string;
  affiliation: string | null;
  email: string;
  phone: string | null;
  title: string;
  abstract: string;
  categoryId: string;
  categoryName: string;
  status: PosterStatus;
  reviewComment: string | null;
  createdAt: string;
};

export async function fetchPosterSubmissions(): Promise<PosterView[]> {
  const admin = createAdminClient();
  const [{ data: posters }, { data: categories }] = await Promise.all([
    admin.from("poster_submissions").select("*").order("created_at", { ascending: false }),
    admin.from("categories").select("id,name"),
  ]);

  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (posters ?? []).map((p) => ({
    id: p.id,
    reference: p.reference,
    presenterName: p.presenter_name,
    affiliation: p.affiliation,
    email: p.email,
    phone: p.phone,
    title: p.title,
    abstract: p.abstract,
    categoryId: p.category_id,
    categoryName: catMap.get(p.category_id) ?? "",
    status: p.status,
    reviewComment: p.review_comment,
    createdAt: p.created_at,
  }));
}

export type ApprovedPoster = {
  id: string;
  title: string;
  abstract: string;
  presenterName: string;
  affiliation: string | null;
  categoryName: string;
};

/** Public "approved posters" listing — no email/phone, same pattern as fetchApprovedListing. */
export async function fetchApprovedPosters(): Promise<ApprovedPoster[]> {
  const admin = createAdminClient();
  const [{ data: posters }, { data: categories }] = await Promise.all([
    admin
      .from("poster_submissions")
      .select("id, title, abstract, presenter_name, affiliation, category_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    admin.from("categories").select("id,name"),
  ]);

  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (posters ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    abstract: p.abstract,
    presenterName: p.presenter_name,
    affiliation: p.affiliation,
    categoryName: catMap.get(p.category_id) ?? "",
  }));
}
