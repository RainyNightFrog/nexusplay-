/** NexusPlay 全站統一滾軸樣式（主站 globals.css 與 iframe 嵌入共用） */
export const NEXUS_SCROLLBAR_CSS = `
*{scrollbar-width:thin;scrollbar-color:rgba(34,211,238,.55) rgba(255,255,255,.06)}
*::-webkit-scrollbar{width:8px;height:8px}
*::-webkit-scrollbar-track{margin:2px;background:rgba(255,255,255,.06);border-radius:999px}
*::-webkit-scrollbar-thumb{
  border:2px solid transparent;border-radius:999px;
  background:linear-gradient(180deg,rgba(34,211,238,.85) 0%,rgba(139,92,246,.85) 100%);
  background-clip:padding-box;
  box-shadow:0 0 8px rgba(34,211,238,.45),inset 0 0 2px rgba(255,255,255,.25)
}
*::-webkit-scrollbar-thumb:hover{
  background:linear-gradient(180deg,rgba(34,211,238,1) 0%,rgba(167,139,250,1) 100%);
  box-shadow:0 0 12px rgba(34,211,238,.6),0 0 8px rgba(139,92,246,.35)
}
*::-webkit-scrollbar-corner{background:transparent}
`.trim();

export const NEXUS_SCROLLBAR_STYLE_TAG = `<style id="nexusplay-scrollbar">${NEXUS_SCROLLBAR_CSS}</style>`;
