"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export type PresenceStatus = "online" | "offline";

/**
 * Supabase Realtime Presence でルーム内の接続ユーザーを監視するフック。
 * チャンネル名: room_presence_${gameId}
 * track ペイロード: { user_id, online_at }
 */
export function usePresence(
  gameId: string | null,
  userId: string | null,
  player1Id: string | null,
  player2Id: string | null
) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!gameId) return;

    const channelName = `room_presence_${gameId}`;
    const channel = supabase.channel(
      channelName,
      userId ? { config: { presence: { key: userId } } } : {}
    );

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const keys = Object.keys(state);
      setOnlineUsers(keys);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && userId) {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      if (userId) {
        void channel.untrack();
      }
      supabase.removeChannel(channel);
    };
  }, [gameId, userId]);

  const opponentStatus = useMemo((): PresenceStatus | null => {
    if (!player1Id || !player2Id) return null;
    if (userId === player1Id) return onlineUsers.includes(player2Id) ? "online" : "offline";
    if (userId === player2Id) return onlineUsers.includes(player1Id) ? "online" : "offline";
    return null;
  }, [userId, player1Id, player2Id, onlineUsers]);

  const player1Status = useMemo((): PresenceStatus | null => {
    if (!player1Id) return null;
    return onlineUsers.includes(player1Id) ? "online" : "offline";
  }, [player1Id, onlineUsers]);

  const player2Status = useMemo((): PresenceStatus | null => {
    if (!player2Id) return null;
    return onlineUsers.includes(player2Id) ? "online" : "offline";
  }, [player2Id, onlineUsers]);

  return { onlineUsers, opponentStatus, player1Status, player2Status };
}
