/**
 * 執行全部撲克引擎單元測試
 * 用法：npx tsx lib/poker/__tests__/run-all.ts
 */

import "./hand-evaluator.test";
import "./pot.test";
import "./engine.test";
import "./hud-stats.test";
import "./pre-action.test";
import "./ai-bot.test";

console.log("✅ lib/poker — all unit tests passed");
