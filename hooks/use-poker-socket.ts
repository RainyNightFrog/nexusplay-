"use client";

import { useCallback, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { createClient } from "@/lib/supabase/client";
import {
  usePokerStore,
  type ActionArgs,
  type JoinTableArgs,
} from "@/stores/poker-store";

/**
 * 模組級單例：大廳／牌桌切換時不可斷線，否則會入桌失敗並重複扣買入。
 */
let sharedSocket: Socket | null = null;
let connectPromise: Promise<Socket | null> | null = null;
let listenersBound = false;
let pageHoldCount = 0;

export type LeaveResult = {
  ok: boolean;
  stack: number;
  cashedOut: number;
  message?: string;
};
let leaveWaiters: Array<(r: LeaveResult) => void> = [];

function resolveLeaveWaiters(result: LeaveResult) {
  const waiters = leaveWaiters;
  leaveWaiters = [];
  for (const w of waiters) w(result);
}

function hardDisconnect() {
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  listenersBound = false;
  connectPromise = null;
  leaveWaiters = [];
  usePokerStore.getState().clearQueue();
  usePokerStore.getState().resetTable();
  usePokerStore.getState().setError(null);
  usePokerStore.getState().setStatus("idle");
}

/**
 * 立刻向伺服器請求結算離桌（關閉遊戲／離頁／斷線前必呼叫）。
 * 回傳實際兌現結果；無座位時立即成功。
 */
export function forcePokerSettleLeave(
  timeoutMs = 8000,
): Promise<LeaveResult> {
  const { roomId, queueRoomId } = usePokerStore.getState();
  if (!roomId && !queueRoomId) {
    return Promise.resolve({ ok: true, stack: 0, cashedOut: 0 });
  }
  if (!sharedSocket?.connected) {
    usePokerStore.getState().resetTable();
    usePokerStore.getState().clearQueue();
    usePokerStore.getState().setStatus("idle");
    return Promise.resolve({
      ok: false,
      stack: 0,
      cashedOut: 0,
      message: "連線已斷，伺服器會嘗試自動兌現",
    });
  }

  return new Promise<LeaveResult>((resolve) => {
    const timer = window.setTimeout(() => {
      leaveWaiters = leaveWaiters.filter((w) => w !== onResult);
      /* 逾時仍斷線，交由伺服器 disconnect 補兌現 */
      resolve({
        ok: false,
        stack: 0,
        cashedOut: 0,
        message: "結算逾時，伺服器將於斷線時補兌現",
      });
    }, timeoutMs);

    function onResult(r: LeaveResult) {
      window.clearTimeout(timer);
      resolve(r);
    }

    leaveWaiters.push(onResult);
    try {
      sharedSocket!.emit("leave_table");
    } catch {
      window.clearTimeout(timer);
      leaveWaiters = leaveWaiters.filter((w) => w !== onResult);
      resolve({
        ok: false,
        stack: 0,
        cashedOut: 0,
        message: "無法送出離桌請求",
      });
    }
  });
}

function bindSocketListeners(socket: Socket) {
  if (listenersBound) return;
  listenersBound = true;

  const store = () => usePokerStore.getState();

  socket.on("connect", () => {
    store().setStatus(store().roomId ? "in_table" : "connected");
    store().setError(null);
    socket.emit("lobby");
  });

  socket.on("connect_error", (err) => {
    const msg = err.message || "無法連線遊戲伺服器";
    console.warn("[poker-socket] connect_error", msg);
    const wsUrl = store().wsUrl;
    if (msg.includes("請先登入") || msg.includes("登入已失效")) {
      store().setError("請先登入平台帳號後再連線牌桌");
    } else if (
      msg.includes("xhr poll error") ||
      msg.includes("websocket error") ||
      msg.includes("timeout") ||
      msg.includes("TransportError")
    ) {
      store().setError(
        `無法連上牌桌伺服器（${wsUrl}）。請確認已執行 npm run poker:server`,
      );
    } else {
      store().setError(msg);
    }
    store().setStatus("error");
  });

  socket.on("lobby_state", (lobby) => {
    store().setLobby(lobby);
  });

  socket.on("joined", (msg: { roomId: string; seatId: string }) => {
    store().setJoined(msg.roomId, msg.seatId);
  });

  socket.on(
    "queued",
    (msg: {
      roomId: string;
      position: number;
      queueCount: number;
      labelZh?: string;
      code?: string;
    }) => {
      store().setQueued(msg);
      store().setLeaveNotice(
        `已加入排隊：第 ${msg.position} 位（共 ${msg.queueCount} 人）`,
      );
      window.setTimeout(() => {
        if (
          store().leaveNotice?.includes("已加入排隊")
        ) {
          store().setLeaveNotice(null);
        }
      }, 4000);
    },
  );

  socket.on(
    "queue_cancelled",
    (msg: { roomId?: string; buyIn?: number }) => {
      store().clearQueue();
      if (msg.buyIn && msg.buyIn > 0) {
        const bal = store().pointsBalance;
        if (bal != null) {
          store().setMeta({ pointsBalance: bal + msg.buyIn });
        }
        void fetch("/api/poker/economy/balance")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && typeof data.pointsBalance === "number") {
              store().setMeta({ pointsBalance: data.pointsBalance });
            }
          })
          .catch(() => {});
      }
      store().setLeaveNotice("已取消排隊");
      window.setTimeout(() => {
        if (store().leaveNotice === "已取消排隊") {
          store().setLeaveNotice(null);
        }
      }, 3000);
    },
  );

  socket.on("poker", (payload) => {
    const p = payload as {
      type?: string;
      ok?: boolean;
      stack?: number;
      cashedOut?: number;
      message?: string;
      roomId?: string;
      position?: number;
      queueCount?: number;
      labelZh?: string;
      code?: string;
      buyIn?: number;
    };
    if (p?.type === "queued" && p.roomId && p.position != null) {
      store().setQueued({
        roomId: p.roomId,
        position: p.position,
        queueCount: p.queueCount ?? p.position,
        labelZh: p.labelZh,
        code: p.code,
      });
      return;
    }
    if (p?.type === "queue_cancelled") {
      store().clearQueue();
      return;
    }
    if (p?.type === "left_table") {
      const result: LeaveResult = {
        ok: p.ok !== false,
        stack: p.stack ?? 0,
        cashedOut: p.cashedOut ?? 0,
        message: p.message,
      };
      store().resetTable();
      store().clearQueue();
      if (socket.connected) {
        store().setStatus("connected");
      }
      if (result.ok) {
        store().setError(null);
        if (result.cashedOut > 0) {
          const bal = store().pointsBalance;
          if (bal != null) {
            store().setMeta({ pointsBalance: bal + result.cashedOut });
          }
        }
        /* 無論有無兌回都向伺服器對帳，確保積分庫即時更新 */
        void fetch("/api/poker/economy/balance")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && typeof data.pointsBalance === "number") {
              store().setMeta({ pointsBalance: data.pointsBalance });
            }
          })
          .catch(() => {
            /* 已用本地加總預估 */
          });
        /* 成功結算用短訊（琥珀色），勿當錯誤紅字 */
        if (result.message) {
          store().setLeaveNotice(result.message);
          window.setTimeout(() => {
            if (store().leaveNotice === result.message) {
              store().setLeaveNotice(null);
            }
          }, 5000);
        }
      } else if (result.message) {
        store().setError(result.message);
      }
      resolveLeaveWaiters(result);
      return;
    }
    store().applyPokerEvent(payload);
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io client disconnect") {
      store().setStatus("idle");
      return;
    }
    /* 非主動斷線：保留 room 狀態提示重連，勿清桌造成重複買入 */
    store().setStatus("connecting");
    store().setError("連線中斷，正在嘗試重連…");
  });
}

async function ensureSocket(): Promise<Socket | null> {
  if (sharedSocket?.connected) return sharedSocket;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const store = usePokerStore.getState();
    store.setStatus("connecting");
    store.setError(null);

    let token: string | undefined;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
      if (!token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        token = refreshed.session?.access_token;
      }
    } catch {
      /* anon possible */
    }

    if (sharedSocket) {
      sharedSocket.removeAllListeners();
      sharedSocket.disconnect();
      sharedSocket = null;
      listenersBound = false;
    }

    const socket = io(store.wsUrl, {
      path: "/poker-socket",
      auth: token ? { token } : {},
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 12,
      timeout: 15000,
      withCredentials: true,
    });

    bindSocketListeners(socket);
    sharedSocket = socket;

    if (socket.connected) return socket;

    return await new Promise<Socket | null>((resolve) => {
      const onOk = () => {
        cleanup();
        resolve(socket);
      };
      const onErr = () => {
        cleanup();
        resolve(null);
      };
      const timer = window.setTimeout(() => {
        cleanup();
        store.setError("連線逾時，請按重新連線");
        store.setStatus("error");
        resolve(null);
      }, 15000);
      function cleanup() {
        window.clearTimeout(timer);
        socket.off("connect", onOk);
        socket.off("connect_error", onErr);
      }
      socket.once("connect", onOk);
      socket.once("connect_error", onErr);
    });
  })();

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
}

export function usePokerSocket() {
  const handsSincePlaytimeTick = usePokerStore((s) => s.handsSincePlaytimeTick);

  const connect = useCallback(async () => {
    return ensureSocket();
  }, []);

  const disconnect = useCallback(() => {
    void forcePokerSettleLeave(4000).finally(() => {
      hardDisconnect();
    });
  }, []);

  const joinTable = useCallback(async (args: JoinTableArgs) => {
    const socket = await ensureSocket();
    if (!socket?.connected) {
      usePokerStore.getState().setError("尚未連上牌桌伺服器，請先重新連線");
      usePokerStore.getState().setStatus("error");
      return;
    }
    socket.emit("join_table", args);
  }, []);

  const leaveQueue = useCallback(() => {
    if (!sharedSocket?.connected) {
      usePokerStore.getState().clearQueue();
      return;
    }
    sharedSocket.emit("leave_queue");
  }, []);

  const leaveTable = useCallback((): Promise<LeaveResult> => {
    return forcePokerSettleLeave(35000);
  }, []);

  const sendAction = useCallback((args: ActionArgs) => {
    if (!sharedSocket?.connected) {
      usePokerStore.getState().setError("連線已斷，請重新連線後再操作");
      return;
    }
    sharedSocket.emit("action", args);
  }, []);

  const resumePlay = useCallback(() => {
    if (!sharedSocket?.connected) {
      usePokerStore.getState().setError("連線已斷，請重新連線後再操作");
      return;
    }
    sharedSocket.emit("resume_play");
  }, []);

  const topUp = useCallback((amount: number) => {
    if (!sharedSocket?.connected) {
      usePokerStore.getState().setError("連線已斷，請重新連線後再操作");
      return;
    }
    sharedSocket.emit("top_up", { amount });
  }, []);

  /** 頁面持有：卸載前先即時結算，再斷線 */
  useEffect(() => {
    pageHoldCount += 1;
    return () => {
      pageHoldCount = Math.max(0, pageHoldCount - 1);
      if (pageHoldCount === 0) {
        window.setTimeout(() => {
          if (pageHoldCount !== 0) return;
          void forcePokerSettleLeave(5000).finally(() => {
            if (pageHoldCount === 0) hardDisconnect();
          });
        }, 200);
      }
    };
  }, []);

  /* 關閉分頁／重整：立刻送結算（瀏覽器可能來不及等 ack，伺服器 disconnect 會再補） */
  useEffect(() => {
    const flush = () => {
      const { roomId, queueRoomId } = usePokerStore.getState();
      if (!roomId && !queueRoomId) return;
      if (!sharedSocket?.connected) return;
      try {
        sharedSocket.emit("leave_table");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      const hands = usePokerStore.getState().handsSincePlaytimeTick;
      if (hands < 1) return;
      try {
        const res = await fetch("/api/poker/economy/playtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handsInWindow: hands }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.awarded) {
            usePokerStore.setState({
              handsSincePlaytimeTick: 0,
              pointsBalance: data.balance,
            });
          }
        }
      } catch {
        /* ignore */
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [handsSincePlaytimeTick]);

  return {
    connect,
    disconnect,
    joinTable,
    leaveTable,
    leaveQueue,
    sendAction,
    topUp,
    forceSettleLeave: forcePokerSettleLeave,
    resumePlay,
  };
}
