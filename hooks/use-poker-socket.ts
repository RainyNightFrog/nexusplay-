"use client";

import { useCallback, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { createClient } from "@/lib/supabase/client";
import {
  usePokerStore,
  type ActionArgs,
  type JoinTableArgs,
} from "@/stores/poker-store";

export function usePokerSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    wsUrl,
    setStatus,
    setError,
    setLobby,
    applyPokerEvent,
    setJoined,
    resetTable,
    handsSincePlaytimeTick,
  } = usePokerStore();

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return socketRef.current;

    setStatus("connecting");
    setError(null);

    let token: string | undefined;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      /* anon possible if server allows */
    }

    const socket = io(wsUrl, {
      path: "/poker-socket",
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("lobby");
    });

    socket.on("connect_error", (err) => {
      setError(err.message || "無法連線遊戲伺服器");
      setStatus("error");
    });

    socket.on("lobby_state", (lobby) => {
      setLobby(lobby);
    });

    socket.on("joined", (msg: { roomId: string; seatId: string }) => {
      setJoined(msg.roomId, msg.seatId);
    });

    socket.on("poker", (payload) => {
      applyPokerEvent(payload);
    });

    socket.on("disconnect", () => {
      setStatus("idle");
    });

    socketRef.current = socket;
    return socket;
  }, [
    wsUrl,
    setStatus,
    setError,
    setLobby,
    applyPokerEvent,
    setJoined,
  ]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    resetTable();
    setStatus("idle");
  }, [resetTable, setStatus]);

  const joinTable = useCallback(
    async (args: JoinTableArgs) => {
      const socket = await connect();
      socket.emit("join_table", args);
    },
    [connect],
  );

  const leaveTable = useCallback(() => {
    socketRef.current?.emit("leave_table");
    resetTable();
  }, [resetTable]);

  const sendAction = useCallback((args: ActionArgs) => {
    socketRef.current?.emit("action", args);
  }, []);

  /** 每 10 分鐘嘗試領在線獎勵（需本區間至少 1 手） */
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

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return { connect, disconnect, joinTable, leaveTable, sendAction };
}
