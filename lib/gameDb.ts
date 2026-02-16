import { supabase } from "@/lib/supabase";
import type { GameState } from "@/app/types";

/** lost_cities_games の1行。ゲーム状態は game_state JSON に集約 */
export interface LostCitiesGameRow {
  id: string;
  created_at: string;
  status: "waiting" | "playing" | "finished";
  player1_id: string;
  player2_id: string | null;
  game_state: GameState | null;
}

/** DB保存時は selectedCard を null にする（UI専用のため） */
function gameStateForDb(state: GameState): GameState {
  return { ...state, selectedCard: null };
}

/** ゲーム作成（Host） */
export async function createGame(hostId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("lost_cities_games")
    .insert({ player1_id: hostId, status: "waiting" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** 1件取得 */
export async function getGame(gameId: string): Promise<LostCitiesGameRow | null> {
  const { data, error } = await supabase
    .from("lost_cities_games")
    .select("*")
    .eq("id", gameId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as LostCitiesGameRow;
}

/** 参加（Join）：player2_id をセット */
export async function joinGame(gameId: string, guestId: string): Promise<void> {
  const { error } = await supabase
    .from("lost_cities_games")
    .update({ player2_id: guestId })
    .eq("id", gameId)
    .is("player2_id", null);
  if (error) throw error;
}

/** ゲーム状態を更新（プレイ・ドロー時）。game_state を丸ごと更新 */
export async function updateGameState(gameId: string, state: GameState): Promise<void> {
  const { error } = await supabase
    .from("lost_cities_games")
    .update({
      game_state: gameStateForDb(state),
      status: state.deck.length === 0 ? "finished" : "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}

/** ゲーム開始：初期状態を game_state に書き込む */
export async function startGame(gameId: string, initialState: GameState): Promise<void> {
  const { error } = await supabase
    .from("lost_cities_games")
    .update({
      game_state: gameStateForDb(initialState),
      status: "playing",
    })
    .eq("id", gameId);
  if (error) throw error;
}
