"use client";

import { useCallback, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { NoThanksGameState } from "@/app/nothanksLogic";
import {
  createInitialNoThanksState,
  payChip,
  takeCard,
  calculateScores,
  getWinnerIndex,
} from "@/app/nothanksLogic";
import { useNoThanksRealtime } from "@/lib/useNoThanksRealtime";
import { startNoThanksGame, updateNoThanksGameState } from "@/lib/gameDb";

type PlayerRole = number | "spectator"; // number = player index (0-based)

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2 py-1 rounded border border-purple-500/60 bg-purple-800/60 hover:bg-purple-700/60 text-purple-100 text-sm font-medium"
    >
      {copied ? "コピーしました" : "📋 コピー"}
    </button>
  );
}

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = typeof params.id === "string" ? params.id : null;
  const pid = searchParams.get("pid") ?? "";

  const { gameData, loading, error } = useNoThanksRealtime(gameId);
  const playerIds: string[] = Array.isArray(gameData?.player_ids) ? gameData.player_ids : [];
  const [isSubmitting, setIsSubmitting] = useState(false);

  const playerIndex = pid ? playerIds.indexOf(pid) : -1;
  const myRole: PlayerRole = playerIndex >= 0 ? playerIndex : "spectator";
  const myIndex = myRole === "spectator" ? -1 : (myRole as number);
  const isHost = myIndex === 0;
  const isSpectator = myRole === "spectator";

  const state: NoThanksGameState | null = gameData?.game_state ?? null;

  const handleStartGame = useCallback(async () => {
    if (!gameId || !isHost || playerIds.length < 3) return;
    setIsSubmitting(true);
    try {
      const initialState = createInitialNoThanksState(playerIds.length);
      await startNoThanksGame(gameId, initialState);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isHost, playerIds.length]);

  const handlePayChip = useCallback(async () => {
    if (isSpectator || myIndex < 0 || !gameId || !state || state.phase !== "playing") return;
    const next = payChip(state, myIndex, playerIds.length);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateNoThanksGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myIndex, playerIds.length, isSpectator]);

  const handleTakeCard = useCallback(async () => {
    if (isSpectator || myIndex < 0 || !gameId || !state || state.phase !== "playing") return;
    const next = takeCard(state, myIndex, playerIds.length);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateNoThanksGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myIndex, playerIds.length, isSpectator]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-purple-950 text-purple-100">
        <h1 className="text-2xl font-bold font-serif">Cursed Gifts</h1>
        <p className="text-purple-300">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-purple-950 text-purple-100">
        <h1 className="text-2xl font-bold font-serif">Cursed Gifts</h1>
        <p className="text-red-400">ゲームの取得に失敗しました</p>
        <Link href="/nothanks" className="text-purple-300 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  // ---------- Waiting: 参加者表示 & 開始ボタン（Host・3人以上） ----------
  if (gameData.status === "waiting") {
    const canStart = playerIds.length >= 3 && isHost;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-purple-950 to-stone-900 text-stone-100">
        <h1 className="text-3xl font-bold font-serif text-purple-100">Cursed Gifts</h1>
        <p className="text-purple-300">不気味な洋館で呪いの贈り物を押し付け合うゲーム</p>
        <div className="rounded-xl bg-purple-900/60 p-6 border-4 border-purple-700/70 shadow-2xl max-w-md w-full">
          <p className="text-sm text-purple-200 font-medium mb-2">参加者: {playerIds.length}人</p>
          {playerIds.length < 3 && (
            <p className="text-amber-300 text-sm mb-4">3人以上でゲームを開始できます。</p>
          )}
          {isHost && (
            <>
              <p className="text-xs text-purple-400 mb-2">ゲームID（相手に伝えてください）</p>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <p className="font-mono font-bold text-purple-100 break-all">{gameData.id}</p>
                <CopyButton text={gameData.id} />
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={!canStart || isSubmitting}
                className="w-full px-6 py-4 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-600 border-2 border-purple-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "開始中…" : "ゲームを開始する"}
              </button>
            </>
          )}
          {!isHost && !isSpectator && (
            <p className="text-purple-300 text-sm">Hostがゲームを開始するまでお待ちください。</p>
          )}
          {isSpectator && (
            <p className="text-purple-300 text-sm">観戦中です。ゲーム開始までお待ちください。</p>
          )}
        </div>
        <Link href="/nothanks" className="text-purple-300 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-purple-950 text-purple-100">
        <h1 className="text-2xl font-bold font-serif">Cursed Gifts</h1>
        <p className="text-purple-300">ゲームデータを読み込めません</p>
        <Link href="/nothanks" className="text-purple-300 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  const n = state.playerChips.length;
  const currentPlayerIndex = state.currentPlayerIndex;
  const isMyTurn = !isSpectator && state.phase === "playing" && currentPlayerIndex === myIndex;
  const myChips = isSpectator ? 0 : state.playerChips[myIndex] ?? 0;
  const canPass = isMyTurn && myChips >= 1;
  const scores = calculateScores(state);
  const winnerIndex = getWinnerIndex(state);

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 bg-gradient-to-b from-purple-950 to-stone-900 text-stone-100">
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {isSpectator && (
            <span className="px-3 py-1.5 rounded-lg bg-purple-700 text-white text-sm font-bold border-2 border-purple-500 shadow-lg">
              👀 観戦モード
            </span>
          )}
          <h1 className="text-2xl font-bold font-serif text-purple-100">Cursed Gifts</h1>
        </div>
        <Link href="/nothanks" className="text-purple-300 text-sm underline hover:text-purple-200 font-medium">
          ロビーに戻る
        </Link>
      </div>

      {/* 中央: 現在のカード & ポットチップ */}
      <section className="rounded-xl bg-purple-900/70 p-6 border-4 border-purple-600/80 shadow-2xl flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-purple-300 font-medium">場のカード</p>
        {state.currentCard !== null ? (
          <>
            <div className="w-24 h-32 rounded-xl bg-stone-800 border-4 border-purple-500 flex items-center justify-center shadow-inner">
              <span className="text-4xl font-bold text-purple-100 tabular-nums">{state.currentCard}</span>
            </div>
            <p className="text-purple-200">
              乗っているチップ: <span className="font-bold text-amber-400">{state.potChips}</span> 枚
            </p>
            {state.phase === "playing" && (
              <p className="text-sm text-purple-400">
                手番: {isSpectator ? `Player ${currentPlayerIndex + 1}` : (currentPlayerIndex === myIndex ? "あなた" : `Player ${currentPlayerIndex + 1}`)}
              </p>
            )}
          </>
        ) : (
          <p className="text-purple-400 font-medium">ゲーム終了</p>
        )}

        {/* アクションボタン（手番のプレイヤーのみ・観戦者非表示） */}
        {state.phase === "playing" && state.currentCard !== null && !isSpectator && (
          <div className="flex gap-4 mt-2">
            <button
              type="button"
              onClick={handlePayChip}
              disabled={!canPass || isSubmitting}
              className="px-6 py-3 rounded-xl bg-amber-700/90 text-white font-bold hover:bg-amber-600 border-2 border-amber-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              チップを払う（パス）
            </button>
            <button
              type="button"
              onClick={handleTakeCard}
              disabled={!isMyTurn || isSubmitting}
              className="px-6 py-3 rounded-xl bg-red-800/90 text-white font-bold hover:bg-red-700 border-2 border-red-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              引き取る
            </button>
          </div>
        )}
      </section>

      {/* 各プレイヤー状況 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 flex-1">
        {state.playerCards.map((cards, i) => {
          const chips = state.playerChips[i] ?? 0;
          const score = scores[i] ?? 0;
          const isCurrent = state.phase === "playing" && state.currentPlayerIndex === i;
          const label = isSpectator ? `Player ${i + 1}` : (i === myIndex ? "あなた" : `Player ${i + 1}`);
          return (
            <section
              key={i}
              className={`rounded-xl p-4 border-4 shadow-xl ${
                isCurrent
                  ? "bg-purple-700/50 border-amber-500/80"
                  : "bg-purple-900/50 border-purple-600/60"
              }`}
            >
              <p className="text-sm font-bold text-purple-100 mb-2 flex items-center gap-1.5">
                {label}
                {isCurrent && state.phase === "playing" && <span className="text-amber-400 text-xs">← 手番</span>}
              </p>
              <p className="text-xs text-purple-300 mb-1">チップ: {chips} 枚</p>
              <p className="text-xs text-purple-300 mb-2">得点: {score} 点</p>
              <p className="text-xs text-purple-400 mb-1">引き取ったカード:</p>
              <div className="flex flex-wrap gap-1 min-h-[2rem]">
                {cards.length === 0 ? (
                  <span className="text-purple-500 text-xs">（なし）</span>
                ) : (
                  cards.map((num, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center justify-center w-8 h-8 rounded bg-stone-700/80 text-purple-100 text-sm font-mono"
                    >
                      {num}
                    </span>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* ゲーム終了時: 勝者表示 */}
      {state.phase === "finished" && winnerIndex !== null && (
        <div className="rounded-xl bg-amber-900/40 p-4 border-4 border-amber-600/60 text-center">
          <p className="text-lg font-bold text-amber-200 font-serif">
            {isSpectator
              ? `Player ${winnerIndex + 1} の勝ち！`
              : winnerIndex === myIndex
                ? "あなたの勝ち！"
                : `Player ${winnerIndex + 1} の勝ち！`}
          </p>
        </div>
      )}

      <footer className="text-center text-purple-500 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function NoThanksGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-purple-950 text-purple-100">
          <h1 className="text-2xl font-bold font-serif">Cursed Gifts</h1>
          <p className="text-purple-300">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
