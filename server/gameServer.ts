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

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
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

const orchestrator = new TableOrchestrator(
  (roomId, payload) => {
    io.to(roomId).emit("poker", payload);
  },
  (socketId, payload) => {
    io.to(socketId).emit("poker", payload);
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
);

io.use(async (socket, next) => {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      if (process.env.POKER_ALLOW_ANON === "1") {
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

    (socket.data as SocketData).userId = data.user.id;
    (socket.data as SocketData).displayName =
      (data.user.user_metadata?.display_name as string) ||
      data.user.email?.split("@")[0] ||
      "Player";
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
    }) => {
      let debited = false;
      try {
        let pokerUserId = data.userId;
        if (supabase && !data.userId.startsWith("anon_")) {
          const pu = await ensurePokerUser(supabase, data.userId, {
            displayName: msg.name || data.displayName,
            avatarUrl: msg.avatarUrl,
          });
          pokerUserId = pu.id;
          if (pu.points_balance < msg.buyIn) {
            throw new Error("積分不足");
          }
          await debitBuyIn(supabase, data.userId, msg.buyIn, "pending-join");
          debited = true;
        }

        const { table, seat } = orchestrator.joinHuman({
          tier: msg.tier,
          userId: data.userId,
          pokerUserId,
          name: msg.name || data.displayName,
          avatarUrl: msg.avatarUrl,
          buyIn: msg.buyIn,
          socketId: socket.id,
        });

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

  socket.on("leave_table", async () => {
    const roomId = [...socket.rooms].find((r) => r !== socket.id);
    const table = roomId ? orchestrator.getTable(roomId) : undefined;
    const seat = table?.occupants.find((o) => o.userId === data.userId);
    const stack = seat?.stack ?? 0;

    orchestrator.leaveHuman(data.userId);
    if (roomId) await socket.leave(roomId);

    if (supabase && stack > 0 && !data.userId.startsWith("anon_")) {
      try {
        await creditCashOut(
          supabase,
          data.userId,
          stack,
          roomId ?? "cashout",
        );
      } catch (e) {
        console.error("[poker-server] cashout failed", e);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`[poker] disconnect ${data.userId}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(
    `✅ Poker game server → http://localhost:${PORT}  path=/poker-socket`,
  );
});
