import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function useGameRealtime(gameId: string | null) {
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    // データを強制的に取りに行く関数
    const fetchGame = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const { data, error } = await supabase
          .from("lost_cities_games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (error) {
           console.error("Fetch error:", error.message);
        } else if (data) {
           // データに変更があれば更新（画面がチラつくのを防ぐ判定付き）
           setGameData((prev: any) => {
             if (JSON.stringify(prev) !== JSON.stringify(data)) {
               return data;
             }
             return prev;
           });
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    };

    // 1. 初回実行
    fetchGame();

    // 2. リアルタイム監視（もし動けばラッキー）
    const channel = supabase
      .channel(`room_${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lost_cities_games", filter: `id=eq.${gameId}` },
        () => fetchGame()
      )
      .subscribe();

    // 3. 【最強の保険】1秒ごとに強制チェック
    // これがあれば、リアルタイム機能が死んでいても必ずゲームが進みます
    const intervalId = setInterval(fetchGame, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [gameId]);

  return { gameData, loading, error };
}