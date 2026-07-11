"use client";

import { useEffect, useRef } from "react";
import type { PublishMonetizationValues } from "@/components/dashboard/publish-monetization-fields";
import type { GamePublishMetadata } from "@/lib/game-metadata";
import type { GamePricingValues } from "@/lib/game-pricing";
import {
  clearGameEditDraft,
  clearGameUploadDraft,
  readGameEditDraft,
  readGameUploadDraft,
  writeGameEditDraft,
  writeGameUploadDraft,
  type PersistedGameFormState,
} from "@/lib/game-form-draft";

type SharedDraftFields = {
  form: PersistedGameFormState;
  metadata: GamePublishMetadata;
  monetization: PublishMonetizationValues;
  pricing: GamePricingValues;
  devlogTitle?: string;
  devlogContent?: string;
};

type EditDraftFields = SharedDraftFields & {
  mode: "edit";
  gameId: number;
  existingGalleryUrls?: string[];
};

type UploadDraftFields = SharedDraftFields & {
  mode: "upload";
};

type UseGameFormDraftOptions = (EditDraftFields | UploadDraftFields) & {
  ready: boolean;
};

const DEBOUNCE_MS = 400;

export function useGameFormDraft(options: UseGameFormDraftOptions) {
  const {
    ready,
    form,
    metadata,
    monetization,
    pricing,
    devlogTitle,
    devlogContent,
    mode,
  } = options;
  const gameId = options.mode === "edit" ? options.gameId : null;
  const existingGalleryUrls =
    options.mode === "edit" ? options.existingGalleryUrls : undefined;
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(() => {
      const payload = {
        form,
        metadata,
        monetization,
        pricing,
        devlogTitle,
        devlogContent,
      };

      if (mode === "edit" && gameId != null) {
        writeGameEditDraft(gameId, {
          ...payload,
          existingGalleryUrls,
        });
      } else if (mode === "upload") {
        writeGameUploadDraft(payload);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, [
    ready,
    form,
    metadata,
    monetization,
    pricing,
    devlogTitle,
    devlogContent,
    mode,
    gameId,
    existingGalleryUrls,
  ]);
}

export function restoreGameEditDraft(gameId: number) {
  return readGameEditDraft(gameId);
}

export function restoreGameUploadDraft() {
  return readGameUploadDraft();
}

export function clearPersistedGameEditDraft(gameId: number) {
  clearGameEditDraft(gameId);
}

export function clearPersistedGameUploadDraft() {
  clearGameUploadDraft();
}
