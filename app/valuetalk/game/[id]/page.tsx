"use client";

import { useCallback, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ValueTalkGameState } from "@/app/valueTalkLogic";
import { playCard, updateDescription, changeTheme, resetGame } from "@/app/valueTalkLogic";
import { useValueTalkRealtime } from "@/lib/useValueTalkRealtime";
import { startValueTalkGame, updateValueTalkGameState } from "@/lib/gameDb";
import { createInitialValueTalkState } from "@/app/valueTalkLogic";

type PlayerRole = number | "spectator";

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
      className="px-2 py-1 rounded border border-orange-400 bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm font-medium"
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

  const { gameData, loading, error } = useValueTalkRealtime(gameId);
  const playerIds: string[] = Array.isArray(gameData?.player_ids) ? gameData.player_ids : [];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftDescriptions, setDraftDescriptions] = useState<Record<number, string>>({});

  const playerIndex = pid ? playerIds.indexOf(pid) : -1;
  const myRole: PlayerRole = playerIndex >= 0 ? playerIndex : "spectator";
  const myIndex = myRole === "spectator" ? -1 : (myRole as number);
  const isHost = myIndex === 0;
  const isSpectator = myRole === "spectator";

  const state: ValueTalkGameState | null = gameData?.game_state ?? null;

  const handleStartGame = useCallback(async () => {
    if (!gameId || !isHost || playerIds.length < 1) return;
    const difficultyParam = searchParams.get("difficulty");
    const difficulty =
      difficultyParam === "EASY" ||
      difficultyParam === "NORMAL" ||
      difficultyParam === "HARD" ||
      difficultyParam === "MIXED" ||
      difficultyParam === "GRADUAL"
        ? difficultyParam
        : "MIXED";
    setIsSubmitting(true);
    try {
      const initialState = createInitialValueTalkState(playerIds.length, difficulty);
      await startValueTalkGame(gameId, initialState);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isHost, playerIds.length, searchParams]);

  const handleUpdateDescription = useCallback(
    async (card: number, text: string) => {
      if (isSpectator || myIndex < 0 || !gameId || !state) return;
      const next = updateDescription(state, myIndex, card, text);
      setIsSubmitting(true);
      try {
        await updateValueTalkGameState(gameId, next);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId, state, myIndex, isSpectator]
  );

  const handlePlayCard = useCallback(
    async (card: number, description: string) => {
      if (isSpectator || myIndex < 0 || !gameId || !state) return;
      const next = playCard(state, myIndex, card, description);
      if (!next) return;
      setIsSubmitting(true);
      try {
        await updateValueTalkGameState(gameId, next);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId, state, myIndex, isSpectator]
  );

  const handleChangeTheme = useCallback(async () => {
    if (!gameId || !state) return;
    const next = changeTheme(state);
    if (!next) return;
    setIsSubmitting(true);
    try {
      await updateValueTalkGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state]);

  const handleRematch = useCallback(async () => {
    if (!gameId || !state) return;
    const next = resetGame(state);
    setIsSubmitting(true);
    try {
      await updateValueTalkGameState(gameId, next);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50 text-orange-900">
        <h1 className="text-2xl font-bold font-serif">Value Talk</h1>
        <p className="text-orange-600">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50 text-orange-900">
        <h1 className="text-2xl font-bold font-serif">Value Talk</h1>
        <p className="text-red-600">ゲームの取得に失敗しました</p>
        <Link href="/valuetalk" className="text-orange-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const canStart = playerIds.length >= 1;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50 text-orange-900">
        <h1 className="text-3xl font-bold font-serif text-orange-800">Value Talk</h1>
        <p className="text-orange-600">協力して数字を当てよう</p>
        <div className="rounded-2xl bg-white/90 p-6 border-4 border-orange-300 shadow-xl max-w-md w-full">
          <p className="text-sm text-orange-700 font-medium mb-2">参加者: {playerIds.length}人</p>
          {isHost && (
            <>
              <p className="text-xs text-orange-500 mb-2">ゲームID（仲間に伝えてください）</p>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <p className="font-mono font-bold text-orange-900 break-all">{gameData.id}</p>
                <CopyButton text={gameData.id} />
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={!canStart || isSubmitting}
                className="w-full px-6 py-4 rounded-xl bg-orange-400 text-white font-bold hover:bg-orange-500 border-2 border-orange-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "開始中…" : "ゲームを開始する"}
              </button>
            </>
          )}
          {!isHost && !isSpectator && <p className="text-orange-600 text-sm">Hostがゲームを開始するまでお待ちください。</p>}
          {isSpectator && <p className="text-orange-600 text-sm">観戦中です。</p>}
        </div>
        <Link href="/valuetalk" className="text-orange-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50 text-orange-900">
        <h1 className="text-2xl font-bold font-serif">Value Talk</h1>
        <p className="text-orange-600">ゲームデータを読み込めません</p>
        <Link href="/valuetalk" className="text-orange-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  const playerLabel = (i: number) => (isSpectator ? `Player ${i + 1}` : i === myIndex ? "あなた" : `Player ${i + 1}`);

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 bg-gradient-to-b from-orange-50 to-amber-50 text-orange-900">
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {isSpectator && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-400/80 text-orange-900 text-sm font-bold border-2 border-orange-400 shadow">
              👀 観戦モード
            </span>
          )}
          <h1 className="text-2xl font-bold font-serif text-orange-800">Value Talk</h1>
          <span className="text-orange-600 text-sm">
            ♥ {state.life} ライフ　レベル {state.level}
          </span>
        </div>
        <Link href="/valuetalk" className="text-orange-600 text-sm underline hover:text-orange-800 font-medium">
          ロビーに戻る
        </Link>
      </div>

      {/* お題 */}
      <section className="rounded-2xl bg-amber-100 border-4 border-orange-300 p-4 shadow-lg text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
          <p className="text-xs text-orange-600 font-medium">お題</p>
          {state.phase === "playing" && !(state.themeChangeUsed ?? false) && !isSpectator && (
            <button
              type="button"
              onClick={handleChangeTheme}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-orange-400 text-white text-sm font-bold hover:bg-orange-500 border-2 border-orange-500 disabled:opacity-50"
            >
              🔄 お題を変える（残り1回）
            </button>
          )}
        </div>
        <p className="text-2xl md:text-3xl font-bold text-orange-900 font-serif">{state.theme}</p>
      </section>

      {/* 失敗メッセージ */}
      {state.lastFailure && (
        <div className="rounded-xl bg-red-200 border-4 border-red-400 p-4 text-red-900 font-bold text-center shadow-lg animate-pulse" role="alert">
          {state.lastFailure.message}
        </div>
      )}

      {/* 場に出たカード（フキダシ風） */}
      <section className="rounded-xl bg-white/90 p-4 border-4 border-orange-200 shadow-inner">
        <p className="text-xs text-orange-600 font-medium mb-2">場のカード</p>
        {state.played_cards.length === 0 ? (
          <p className="text-orange-500 text-sm">まだ1枚も出ていません。小さい数字から出していこう！</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {state.played_cards.map((entry, i) => (
              <div
                key={i}
                className="relative bg-amber-50 border-2 border-orange-300 rounded-xl px-4 py-3 shadow-md max-w-[200px]"
              >
                <p className="text-xs text-orange-500">{playerLabel(entry.playerIndex)}</p>
                <p className="text-lg font-bold text-orange-900">{entry.card}</p>
                {entry.description && (
                  <p className="text-sm text-orange-800 mt-1 italic">&quot;{entry.description}&quot;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 各プレイヤーの手札 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        {state.players.map((p, i) => (
          <section
            key={i}
            className={`rounded-xl p-4 border-4 shadow-lg ${
              i === myIndex ? "bg-orange-100 border-orange-400" : "bg-white/80 border-orange-200"
            }`}
          >
            <p className="text-sm font-bold text-orange-800 mb-2">{playerLabel(i)}</p>
            <p className="text-xs text-orange-600 mb-1">手札: {p.hand.length}枚</p>
            <div className="flex flex-col gap-3">
              {i === myIndex && !isSpectator ? (
                p.hand.map((card) => (
                  <div key={card} className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handlePlayCard(card, p.descriptions[card] ?? "")}
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-amber-200 border-2 border-orange-400 py-3 text-xl font-bold text-orange-900 hover:bg-amber-300 disabled:opacity-50 transition-colors"
                    >
                      {card}
                    </button>
                    <input
                      type="text"
                      placeholder="たとえ話（例: ライオン） Enterで確定"
                      value={draftDescriptions[card] ?? p.descriptions[card] ?? ""}
                      onChange={(e) => setDraftDescriptions((prev) => ({ ...prev, [card]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const text = (draftDescriptions[card] ?? p.descriptions[card] ?? "").trim();
                          if (text) handleUpdateDescription(card, text);
                          setDraftDescriptions((prev) => ({ ...prev, [card]: "" }));
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg border-2 border-orange-300 bg-white text-orange-900 text-sm placeholder-orange-400"
                    />
                  </div>
                ))
              ) : (
                p.hand.map((card) => (
                  <div key={card} className="rounded-xl bg-amber-100 border-2 border-orange-300 py-3 text-center">
                    <span className="text-orange-600 font-bold">?</span>
                    {p.descriptions[card] && (
                      <p className="text-xs text-orange-700 mt-1 italic">&quot;{p.descriptions[card]}&quot;</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {/* ゲーム終了（gameover / cleared）・再戦ボタン */}
      {(state.phase === "gameover" || state.phase === "cleared") && (
        <div className="rounded-xl bg-amber-100 border-4 border-orange-400 p-6 text-center space-y-4">
          {state.phase === "gameover" ? (
            <>
              <p className="text-xl font-bold text-red-900 font-serif">ゲームオーバー</p>
              <p className="text-red-800 mt-1">ライフが0になりました…</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-orange-900 font-serif">クリア！</p>
            </>
          )}
          {!isSpectator && (
            <button
              type="button"
              onClick={handleRematch}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-orange-400 text-white font-bold hover:bg-orange-500 border-2 border-orange-500 shadow-lg disabled:opacity-50"
            >
              🔄 もう一度遊ぶ
            </button>
          )}
        </div>
      )}

      <footer className="text-center text-orange-500 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function ValueTalkGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50 text-orange-900">
          <h1 className="text-2xl font-bold font-serif">Value Talk</h1>
          <p className="text-orange-600">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
