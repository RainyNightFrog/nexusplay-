import type { PublishValidationField } from "@/lib/publish-form-validation";

const FIELD_ELEMENT_IDS: Partial<Record<PublishValidationField, string>> = {
  title: "title",
  description: "description",
  slug: "field-slug",
  genre: "field-genre",
  cover: "field-cover",
  gameZip: "field-game-zip",
  aiDisclosure: "field-ai-disclosure",
  aiContentTypes: "field-ai-disclosure",
  suggestedTip: "suggested-tip-amount",
  pricing: "field-pricing",
  stripeConnect: "field-stripe-connect",
};

export function scrollToFirstValidationField(field: PublishValidationField) {
  const id = FIELD_ELEMENT_IDS[field];
  if (!id) return;

  requestAnimationFrame(() => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}
