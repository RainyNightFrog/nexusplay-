import { loadPublicCreatorProfile } from "@/lib/creator-public-service";
import CreatorPageClient from "./creator-page-client";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function CreatorPublicPage({ params }: Props) {
  const { id } = await params;
  let initialCreator = null;

  try {
    initialCreator = await loadPublicCreatorProfile(id);
  } catch {
    initialCreator = null;
  }

  return (
    <CreatorPageClient creatorId={id} initialCreator={initialCreator} />
  );
}
