"use client";

import {
  DEFAULT_GAME_PUBLISH_METADATA,
  type GameGenre,
  type GamePublishMetadata,
} from "@/lib/game-metadata";
import { GenreTagPicker } from "@/components/dashboard/genre-tag-picker";
import { ViewportSettingsFields } from "@/components/dashboard/viewport-settings-fields";
import { AiDisclosureFields } from "@/components/dashboard/ai-disclosure-fields";
import { GameRichTextEditor } from "@/components/dashboard/game-rich-text-editor";

export type GamePublishMetadataFieldsProps = {
  genre: GameGenre | "";
  metadata: GamePublishMetadata;
  onGenreChange: (genre: GameGenre) => void;
  onMetadataChange: (metadata: GamePublishMetadata) => void;
  disabled?: boolean;
};

export function GamePublishMetadataFields({
  genre,
  metadata,
  onGenreChange,
  onMetadataChange,
  disabled,
}: GamePublishMetadataFieldsProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          分類與標籤
        </h2>
        <GenreTagPicker
          genre={genre}
          tags={metadata.tags}
          onGenreChange={onGenreChange}
          onTagsChange={(tags) => onMetadataChange({ ...metadata, tags })}
          disabled={disabled}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400">
          嵌入選項
        </h2>
        <ViewportSettingsFields
          values={{
            viewportWidth: metadata.viewportWidth,
            viewportHeight: metadata.viewportHeight,
            fullscreenButton: metadata.fullscreenButton,
          }}
          onChange={(viewport) =>
            onMetadataChange({ ...metadata, ...viewport })
          }
          disabled={disabled}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fuchsia-400">
          AI 內容申報
        </h2>
        <AiDisclosureFields
          values={{
            aiDisclosed: metadata.aiDisclosed,
            aiContentTypes: metadata.aiContentTypes,
          }}
          onChange={(ai) => onMetadataChange({ ...metadata, ...ai })}
          disabled={disabled}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
          詳細介紹
        </h2>
        <GameRichTextEditor
          value={metadata.detailsHtml}
          onChange={(detailsHtml) =>
            onMetadataChange({ ...metadata, detailsHtml })
          }
          disabled={disabled}
        />
      </section>
    </div>
  );
}

export { DEFAULT_GAME_PUBLISH_METADATA };
