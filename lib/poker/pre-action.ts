/**
 * 預選下一步：尚未輪到你時先點選，輪到時自動送出
 */

import type { PlayerActionType } from "./types";

export type PreActionKind = "checkFold" | "call" | "callAny" | "allIn";

export type PreAction =
  | { kind: "checkFold" }
  /** 跟注上限：若輪到你時需跟更多則取消預選 */
  | { kind: "call"; maxCall: number }
  | { kind: "callAny" }
  | { kind: "allIn" };

export type ResolvedAction = {
  type: PlayerActionType;
  amount?: number;
};

export function preActionLabelZh(pre: PreAction, toCall: number): string {
  switch (pre.kind) {
    case "checkFold":
      return "過牌／蓋牌";
    case "call":
      return pre.maxCall > 0
        ? `跟注 ${pre.maxCall.toLocaleString()}`
        : "過牌";
    case "callAny":
      return toCall > 0 ? "跟任何注" : "過牌／跟注";
    case "allIn":
      return "全下";
    default:
      return "預選";
  }
}

/**
 * 依預選與當前 toCall／stack 算出實際送出動作。
 * 回傳 null 表示預選失效（例如跟注金額被加高）。
 */
export function resolvePreAction(
  pre: PreAction,
  opts: { toCall: number; stack: number },
): ResolvedAction | null {
  const { toCall, stack } = opts;
  if (stack < 0) return null;

  switch (pre.kind) {
    case "checkFold":
      if (toCall <= 0) return { type: "check" };
      return { type: "fold" };

    case "call": {
      if (toCall <= 0) return { type: "check" };
      if (toCall > pre.maxCall) return null;
      if (toCall >= stack) return { type: "all-in" };
      return { type: "call" };
    }

    case "callAny":
      if (toCall <= 0) return { type: "check" };
      if (toCall >= stack) return { type: "all-in" };
      return { type: "call" };

    case "allIn":
      if (stack <= 0) return null;
      return { type: "all-in" };

    default:
      return null;
  }
}
