"use client";

import { useEffect, useRef } from "react";

const STAR_CONFIG = [
  { size: 14, lerp: 0.26, tone: "cyan", glyph: "\u2726" },
  { size: 12, lerp: 0.19, tone: "white", glyph: "\u2727" },
  { size: 11, lerp: 0.14, tone: "violet", glyph: "\u2726" },
  { size: 10, lerp: 0.11, tone: "cyan", glyph: "\u2727" },
  { size: 9, lerp: 0.09, tone: "fuchsia", glyph: "\u2726" },
  { size: 8, lerp: 0.075, tone: "violet", glyph: "\u2727" },
  { size: 7, lerp: 0.06, tone: "white", glyph: "\u2726" },
] as const;

function isCursorEffectDisabled() {
  return document.documentElement.dataset.reduceMotion === "true";
}

export function NexusCursorGlow() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || isCursorEffectDisabled()) return;

    const stars = Array.from(
      layer.querySelectorAll<HTMLElement>("[data-cursor-star]")
    );
    if (stars.length === 0) return;

    let rafId = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let visible = false;
    const points = stars.map(() => ({ x: targetX, y: targetY }));

    const applyPositions = () => {
      layer.style.opacity = visible ? "1" : "0";

      stars.forEach((star, index) => {
        const point = points[index];
        star.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
      });
    };

    const tick = () => {
      points[0].x += (targetX - points[0].x) * STAR_CONFIG[0].lerp;
      points[0].y += (targetY - points[0].y) * STAR_CONFIG[0].lerp;

      for (let index = 1; index < points.length; index += 1) {
        const prev = points[index - 1];
        const current = points[index];
        const lerp = STAR_CONFIG[index].lerp;
        current.x += (prev.x - current.x) * lerp;
        current.y += (prev.y - current.y) * lerp;
      }

      applyPositions();
      rafId = window.requestAnimationFrame(tick);
    };

    const onMove = (event: MouseEvent) => {
      if (isCursorEffectDisabled()) return;

      targetX = event.clientX;
      targetY = event.clientY;

      if (!visible) {
        visible = true;
        points.forEach((point) => {
          point.x = targetX;
          point.y = targetY;
        });
      }
    };

    const onLeave = () => {
      visible = false;
      applyPositions();
    };

    applyPositions();
    document.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.cancelAnimationFrame(rafId);
      layer.style.removeProperty("opacity");
    };
  }, []);

  return (
    <div ref={layerRef} className="nexus-cursor-stars-layer" aria-hidden="true">
      {STAR_CONFIG.map((star, index) => (
        <span
          key={index}
          data-cursor-star
          className={`nexus-cursor-star nexus-cursor-star--${star.tone}`}
          style={{ fontSize: `${star.size}px` }}
        >
          {star.glyph}
        </span>
      ))}
    </div>
  );
}
