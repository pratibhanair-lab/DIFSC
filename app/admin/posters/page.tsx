import { fetchPosterSubmissions } from "@/lib/posters-view";
import PostersBrowser from "@/components/PostersBrowser";

export const dynamic = "force-dynamic";

export default async function AdminPostersPage() {
  const posters = await fetchPosterSubmissions();

  return <PostersBrowser posters={posters} />;
}
