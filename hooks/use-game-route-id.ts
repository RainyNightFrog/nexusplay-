"use client";

import { useParams } from "next/navigation";
import { resolveSubdomainFromHost } from "@/lib/subdomain";
import { isNumericGameId } from "@/lib/game-slug";

function isLikelyGameRouteId(value: string) {
  return isNumericGameId(value) || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function useGameRouteId() {
  const params = useParams();
  const paramId = typeof params.id === "string" ? params.id.trim() : "";

  if (paramId && isLikelyGameRouteId(paramId)) {
    return paramId;
  }

  if (typeof window !== "undefined") {
    const subdomain = resolveSubdomainFromHost(window.location.host);
    if (subdomain) {
      return subdomain;
    }
  }

  return paramId;
}
