"use client";

import Image, { type ImageProps } from "next/image";

type GameCoverImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
};

function shouldUseUnoptimized(src: string) {
  const normalized = src.split("?")[0]?.toLowerCase() ?? "";
  return normalized.endsWith(".svg");
}

export function GameCoverImage({
  src,
  alt,
  unoptimized,
  ...props
}: GameCoverImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={unoptimized ?? shouldUseUnoptimized(src)}
      {...props}
    />
  );
}
