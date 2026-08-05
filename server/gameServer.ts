/**
 * Virtual Texas Hold'em — Socket.io 即時遊戲伺服器
 * 啟動：npm run poker:server
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Server } from "socket.io";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  TableOrchestrator,
  type TableBroadcast,
} from "../lib/poker/table-orchestrator";
import type { PlayerActionType, TableTierId } from "../lib/poker/types";
import {
  trackPokerQuestEvent,
  debitBuyIn,
  creditCashOut,
  ensurePokerUser,
} from "../lib/poker/economy-service";

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const PORT = Number(process.env.POKER_WS_PORT || 3101);
const ORIGIN = process.env.POKER_CORS_ORIGIN || "*";
/** 開發預設允許無 token 連線，方便本機測試；正式站請勿開 */
const ALLOW_ANON =
  process.env.POKER_ALLOW_ANON === "1" ||
  process.env.NODE_ENV !== "production";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase: SupabaseClient | null =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

if (!supabase) {
  console.warn(
    "[poker-server] 缺少 Supabase 環境變數 — 經濟／任務將略過，記憶體對戰仍可用",
  );
}

type SocketData = {
  userId: string;
  displayName: string;
};

type SettleResult = {
  ok: boolean;
  stack: number;
  cashedOut: number;
  roomId?: string;
  message?: string;
};

/** 同一玩家離桌／斷線共用，避免重複兌現 */
const settleInFlight = new Map<string, Promise<SettleResult>>();

async function settleAndCashOutUser(userId: string): Promise<SettleResult> {
  const existing = settleInFlight.get(userId);
  if (existing) return existing;

  const job = (async (): Promise<SettleResult> => {
    /* 排隊中：退回預扣買入 */
    if (
      !orchestrator.isUserSeated(userId) &&
      orchestrator.isUserQueued(userId)
    ) {
      const q = orchestrator.leaveQueue(userId);
      if (q) {
        let ok = true;
        let cashedOut = 0;
        let message = "已取消排隊";
        if (supabase && !userId.startsWith("anon_") && q.buyIn > 0) {
          try {
            await creditCashOut(supabase, userId, q.buyIn, "queue-refund");
            cashedOut = q.buyIn;
            message = `已取消排隊，退回 ${q.buyIn.toLocaleString()} 積分`;
          } catch (e) {
            ok = false;
            message =
              e instanceof Error ? e.message : "取消排隊退款失敗，請稍後聯繫客服";
          }
        } else {
          cashedOut = q.buyIn;
        }
        return {
          ok,
          stack: q.buyIn,
          cashedOut,
          roomId: q.roomId,
          message,
        };
      }
    }

    const left = await orchestrator.settleLeaveWithStackAsync(userId);
    if (!left) {
      return {
        ok: true,
        stack: 0,
        cashedOut: 0,
        message: "你已不在牌桌上",
      };
    }

    const stack = left.stack;
    if (userId.startsWith("anon_")) {
      return {
        ok: true,
        stack,
        cashedOut: stack,
        roomId: left.roomId,
        message:
          stack > 0
            ? `已離桌，本機訪客籌碼 ${stack.toLocaleString()}（未入帳）`
            : "已離桌",
      };
    }
    if (!supabase) {
      return {
        ok: stack <= 0,
        stack,
        cashedOut: 0,
        roomId: left.roomId,
        message:
          stack > 0
            ? "伺服器無法連線積分系統，籌碼未能兌現。請稍後重新整理或聯繫客服。"
            : "已結算離桌（桌上籌碼為 0）",
      };
    }
    if (stack > 0) {
      try {
        await creditCashOut(supabase, userId, stack, left.roomId);
        return {
          ok: true,
          stack,
          cashedOut: stack,
          roomId: left.roomId,
          message: `已即時兌現 ${stack.toLocaleString()} 積分回帳戶`,
        };
      } catch (e) {
        console.error("[poker-server] cashout failed", e);
        return {
          ok: false,
          stack,
          cashedOut: 0,
          roomId: left.roomId,
          message:
            e instanceof Error ? e.message : "兌現積分失敗，請稍後聯繫客服",
        };
      }
    }
    return {
      ok: true,
      stack: 0,
      cashedOut: 0,
      roomId: left.roomId,
      message: "已結算離桌（桌上籌碼為 0，積分無兌回）",
    };
  })();

  settleInFlight.set(userId, job);
  try {
    return await job;
  } finally {
    settleInFlight.delete(userId);
  }
}

const httpServer = createServer((req, res) => {
  const origin =
    ORIGIN === "*"
      ? (req.headers.origin as string | undefined) || "*"
      : ORIGIN;
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (ORIGIN === "*" && origin !== "*") {
    headers.Vary = "Origin";
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  res.writeHead(200, headers);
  res.end(
    JSON.stringify({
      ok: true,
      service: "poker-game-server",
      rooms: orchestrator.listLobby().length,
    }),
  );
});

const io = new Server(httpServer, {
  cors: { origin: ORIGIN === "*" ? true : ORIGIN, credentials: true },
  path: "/poker-socket",
});

let orchestrator: TableOrchestrator;

orchestrator = new TableOrchestrator(
  (roomId, payload) => {
    io.to(roomId).emit("poker", payload);
  },
  (socketId, payload) => {
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) {
      io.to(socketId).emit("poker", payload);
      return;
    }
    if (payload.type === "queue_admitted") {
      void sock.join(payload.roomId);
      sock.emit("joined", {
        roomId: payload.roomId,
        seatId: payload.seatId,
        code: payload.table.code,
      });
      sock.emit("poker", {
        type: "table_state",
        table: payload.table,
      } satisfies TableBroadcast);
      return;
    }
    if (payload.type === "queued") {
      sock.emit("queued", {
        roomId: payload.roomId,
        code: payload.code,
        labelZh: payload.labelZh,
        position: payload.position,
        queueCount: payload.queueCount,
      });
    }
    if (payload.type === "queue_cancelled") {
      sock.emit("queue_cancelled", {
        roomId: payload.roomId,
        buyIn: payload.buyIn,
      });
    }
    sock.emit("poker", payload);
  },
  (table, ev) => {
    if (!supabase) return;
    const results = orchestrator.extractHumanHandResults(table, ev);
    void (async () => {
      for (const r of results) {
        try {
          await trackPokerQuestEvent(supabase, r.userId, "PLAY_HANDS", 1);
          if (r.foldedPreflop) {
            await trackPokerQuestEvent(supabase, r.userId, "FOLD_PREFLOP", 1);
          }
          if (r.won) {
            await trackPokerQuestEvent(supabase, r.userId, "WIN_POTS", 1);
          }
          if (r.pairOrBetter) {
            await trackPokerQuestEvent(
              supabase,
              r.userId,
              "WIN_HAND_PAIR_OR_BETTER",
              1,
            );
          }
          if (r.wentAllIn) {
            await trackPokerQuestEvent(supabase, r.userId, "ALL_IN_COUNT", 1);
          }
        } catch (e) {
          console.error("[poker-server] quest track failed", e);
        }
      }
    })();
  },
  () => {
    io.emit("lobby_state", orchestrator.listLobby());
  },
  (userId, left, reason) => {
    void (async () => {
      let ok = true;
      let cashedOut = 0;
      let message = reason;
      if (
        supabase &&
        !userId.startsWith("anon_") &&
        left.stack > 0
      ) {
        try {
          await creditCashOut(supabase, userId, left.stack, left.roomId);
          cashedOut = left.stack;
          message = `${reason}（已兌現 ${left.stack.toLocaleString()} 積分）`;
        } catch (e) {
          ok = false;
          message =
            e instanceof Error
              ? e.message
              : "自動離桌兌現失敗，請稍後聯繫客服";
          console.error("[poker-server] AFK auto cashout failed", e);
        }
      } else if (userId.startsWith("anon_")) {
        cashedOut = left.stack;
      }

      /* 通知該玩家所有連線 */
      for (const [, sock] of io.sockets.sockets) {
        const sd = sock.data as SocketData;
        if (sd.userId !== userId) continue;
        await sock.leave(left.roomId);
        sock.emit("poker", {
          type: "left_table",
          ok,
          roomId: left.roomId,
          stack: left.stack,
          cashedOut,
          message,
        } satisfies TableBroadcast);
      }
      io.emit("lobby_state", orchestrator.listLobby());
    })();
  },
);

io.use(async (socket, next) => {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      if (ALLOW_ANON) {
        (socket.data as SocketData).userId = `anon_${socket.id}`;
        (socket.data as SocketData).displayName = "Guest";
        return next();
      }
      return next(new Error("請先登入"));
    }

    if (!supabase) {
      (socket.data as SocketData).userId = `tok_${socket.id}`;
      (socket.data as SocketData).displayName = "Player";
      return next();
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return next(new Error("登入已失效"));

    let displayName =
      (data.user.user_metadata?.display_name as string) ||
      data.user.email?.split("@")[0] ||
      "Player";
    try {
      const { data: siteProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (siteProfile?.display_name?.trim()) {
        displayName = siteProfile.display_name.trim();
      }
    } catch {
      /* keep metadata fallback */
    }

    (socket.data as SocketData).userId = data.user.id;
    (socket.data as SocketData).displayName = displayName;
    next();
  } catch (e) {
    next(e instanceof Error ? e : new Error("Auth failed"));
  }
});

io.on("connection", (socket) => {
  const data = socket.data as SocketData;
  console.log(`[poker] connect ${data.userId}`);

  socket.on("lobby", () => {
    socket.emit("lobby_state", orchestrator.listLobby());
  });

  socket.on(
    "join_table",
    async (msg: {
      tier: TableTierId;
      buyIn: number;
      name?: string;
      avatarUrl?: string | null;
      roomId?: string;
    }) => {
      let debited = false;
      try {
        let pokerUserId = data.userId;
        let seatName = msg.name || data.displayName;
        const alreadySeated = orchestrator.isUserSeated(data.userId);
        const alreadyQueued = orchestrator.isUserQueued(data.userId);

        if (supabase && !data.userId.startsWith("anon_")) {
          const pu = await ensurePokerUser(supabase, data.userId, {
            displayName: msg.name || data.displayName,
            avatarUrl: msg.avatarUrl,
          });
          pokerUserId = pu.id;
          seatName = pu.display_name || seatName;

          if (!alreadySeated && !alreadyQueued) {
            if (pu.points_balance < msg.buyIn) {
              throw new Error("積分不足");
            }
            await debitBuyIn(supabase, data.userId, msg.buyIn, "pending-join");
            debited = true;
          }
        }

        const result = orchestrator.joinHuman({
          tier: msg.tier,
          userId: data.userId,
          pokerUserId,
          name: seatName,
          avatarUrl: msg.avatarUrl,
          buyIn: msg.buyIn,
          socketId: socket.id,
          roomId: msg.roomId,
        });

        if (result.status === "queued") {
          socket.emit("queued", {
            roomId: result.table.roomId,
            code: result.table.code,
            labelZh: result.table.labelZh,
            position: result.position,
            queueCount: result.queueCount,
          });
          socket.emit("poker", {
            type: "queued",
            roomId: result.table.roomId,
            code: result.table.code,
            labelZh: result.table.labelZh,
            position: result.position,
            queueCount: result.queueCount,
          } satisfies TableBroadcast);
          return;
        }

        const { table, seat } = result;
        await socket.join(table.roomId);
        socket.emit("poker", {
          type: "table_state",
          table: orchestrator.toPublic(table, seat.seatId),
        } satisfies TableBroadcast);
        socket.emit("joined", {
          roomId: table.roomId,
          seatId: seat.seatId,
          code: table.code,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "入桌失敗";
        socket.emit("poker", {
          type: "error",
          message,
        } satisfies TableBroadcast);
        if (debited && supabase) {
          try {
            await creditCashOut(supabase, data.userId, msg.buyIn, "refund");
          } catch {
            /* ignore */
          }
        }
      }
    },
  );

  socket.on("leave_queue", async () => {
    const left = orchestrator.leaveQueue(data.userId);
    if (!left) {
      socket.emit("poker", {
        type: "error",
        message: "你目前沒有在排隊",
      } satisfies TableBroadcast);
      return;
    }
    let refunded = 0;
    if (
      supabase &&
      !data.userId.startsWith("anon_") &&
      left.buyIn > 0
    ) {
      try {
        await creditCashOut(supabase, data.userId, left.buyIn, "queue-refund");
        refunded = left.buyIn;
      } catch (e) {
        console.error("[poker-server] queue refund failed", e);
      }
    }
    socket.emit("queue_cancelled", {
      roomId: left.roomId,
      buyIn: refunded || left.buyIn,
    });
    socket.emit("poker", {
      type: "queue_cancelled",
      roomId: left.roomId,
      buyIn: refunded || left.buyIn,
    } satisfies TableBroadcast);
    socket.emit("lobby_state", orchestrator.listLobby());
  });

  socket.on("resume_play", () => {
    try {
      orchestrator.resumeFromRest(data.userId);
    } catch (e) {
      socket.emit("poker", {
        type: "error",
        message: e instanceof Error ? e.message : "無法結束休息",
      } satisfies TableBroadcast);
    }
  });

  socket.on("action", (msg: { type: PlayerActionType; amount?: number }) => {
    try {
      orchestrator.applyPlayerAction(data.userId, msg.type, msg.amount ?? 0);
    } catch (e) {
      socket.emit("poker", {
        type: "error",
        message: e instanceof Error ? e.message : "行動失敗",
      } satisfies TableBroadcast);
    }
  });

  socket.on("top_up", async (msg: { amount: number }) => {
    let debited = false;
    const amount = Math.floor(Number(msg?.amount) || 0);
    try {
      if (amount <= 0) throw new Error("加買入金額無效");

      if (supabase && !data.userId.startsWith("anon_")) {
        const pu = await ensurePokerUser(supabase, data.userId, {
          displayName: data.displayName,
        });
        if (pu.points_balance < amount) {
          throw new Error("積分不足，無法加買入");
        }
        await debitBuyIn(supabase, data.userId, amount, "top-up");
        debited = true;
      }

      const { table, seat, amount: added } = orchestrator.topUpHuman(
        data.userId,
        amount,
      );
      socket.emit("poker", {
        type: "top_up_ok",
        amount: added,
        stack: seat.stack,
        roomId: table.roomId,
      } satisfies TableBroadcast);
      socket.emit("poker", {
        type: "table_state",
        table: orchestrator.toPublic(table, seat.seatId),
      } satisfies TableBroadcast);
    } catch (e) {
      const message = e instanceof Error ? e.message : "加買入失敗";
      socket.emit("poker", {
        type: "error",
        message,
      } satisfies TableBroadcast);
      if (debited && supabase) {
        try {
          await creditCashOut(supabase, data.userId, amount, "top-up-refund");
        } catch {
          /* ignore */
        }
      }
    }
  });

  socket.on("leave_table", async () => {
    try {
      const result = await settleAndCashOutUser(data.userId);
      if (result.roomId) {
        await socket.leave(result.roomId);
      }
      socket.emit("poker", {
        type: "left_table",
        ok: result.ok,
        roomId: result.roomId,
        stack: result.stack,
        cashedOut: result.cashedOut,
        message: result.message,
      } satisfies TableBroadcast);
      if (!result.ok && result.message) {
        socket.emit("poker", {
          type: "error",
          message: result.message,
        } satisfies TableBroadcast);
      }
      socket.emit("lobby_state", orchestrator.listLobby());
    } catch (e) {
      const message = e instanceof Error ? e.message : "離桌失敗";
      console.error("[poker-server] leave_table failed", e);
      socket.emit("poker", {
        type: "left_table",
        ok: false,
        stack: 0,
        cashedOut: 0,
        message,
      } satisfies TableBroadcast);
      socket.emit("poker", { type: "error", message } satisfies TableBroadcast);
    }
  });

  socket.on("disconnect", async () => {
    console.log(`[poker] disconnect ${data.userId}`);
    try {
      const result = await settleAndCashOutUser(data.userId);
      if (result.cashedOut > 0) {
        console.log(
          `[poker] disconnect settled ${data.userId} +${result.cashedOut}`,
        );
      }
    } catch (e) {
      console.error("[poker-server] disconnect settle failed", e);
    }
  });
});

httpServer.listen(PORT, () => {
  const lobby = orchestrator.listLobby();
  const byTier = ["MICRO", "LOW", "MID", "HIGH"]
    .map((tier) => {
      const n = lobby.filter((t) => t.tier === tier).length;
      const seats = lobby
        .filter((t) => t.tier === tier)
        .map((t) => t.seatedCount)
        .join(",");
      return `${tier}×${n}座[${seats}]`;
    })
    .join(" ");
  console.log(
    `✅ Poker game server → http://localhost:${PORT}  path=/poker-socket`,
  );
  console.log(`   大廳牌桌：${lobby.length} 桌｜${byTier}`);
});
