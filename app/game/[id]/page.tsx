"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Card as CardType, CardColor, GameState, PlayerScore } from "@/app/types";
import { COLORS, COLOR_LABELS } from "@/app/types";
import {
  playCard,
  playCardP2,
  drawCard,
  getDrawOptions,
  canPlayCard,
  calculatePlayerScore,
} from "@/app/gameLogic";
import { Card } from "@/app/components/Card";
import { updateGameState } from "@/lib/gameDb";
import { useGameRealtime } from "@/lib/useGameRealtime";

type PlayerRole = "player1" | "player2";

/** types.PlayerScore に合わせた空のスコア（データ未読込時用） */
function getEmptyPlayerScore(): PlayerScore {
  const emptyExpeditions = COLORS.reduce(
    (acc, c) => ({ ...acc, [c]: [] }),
    {} as Record<CardColor, CardType[]>
  );
  return calculatePlayerScore(emptyExpeditions);
}

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = typeof params.id === "string" ? params.id : null;
  const pid = searchParams.get("pid") ?? "";

  const { gameData, loading, error } = useGameRealtime(gameId);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [discardModalColor, setDiscardModalColor] = useState<CardColor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const prevDeckLength = useRef<number | null>(null);

  // プレイ時間タイマー（created_at から経過 MM:SS）
  useEffect(() => {
    if (!gameData?.created_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [gameData?.created_at]);
  const elapsedMs = gameData?.created_at ? now - new Date(gameData.created_at).getTime() : 0;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const timerLabel = `${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  const emptyPlayerScore = useMemo(() => getEmptyPlayerScore(), []);

  const host_id = gameData?.player1_id ?? null;
  const guest_id = gameData?.player2_id ?? null;
  const state: GameState | null = gameData?.game_state ?? null;
  const myRole: PlayerRole | null =
    pid && host_id && pid === host_id
      ? "player1"
      : pid && guest_id && pid === guest_id
        ? "player2"
        : null;

  useEffect(() => {
    if (state && prevDeckLength.current !== null && prevDeckLength.current > 0 && state.deck.length === 0) {
      setResultModalOpen(true);
    }
    prevDeckLength.current = state?.deck.length ?? null;
  }, [state?.deck.length]);

  const applyAndSave = useCallback(
    async (nextState: GameState) => {
      if (!gameId) return;
      setIsSubmitting(true);
      try {
        const toSave = { ...nextState, selectedCard: null };
        await updateGameState(gameId, toSave);
        setSelectedCard(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId]
  );

  const isMyTurnPlay = state?.phase === "play" && state.currentPlayer === myRole;
  const isMyTurnDraw = state?.phase === "draw" && state.currentPlayer === myRole;
  const isP1Turn = state?.currentPlayer === "player1" && state.phase === "play";
  const isP2Turn = state?.currentPlayer === "player2" && state.phase === "play";
  const isP1Draw = state?.currentPlayer === "player1" && state.phase === "draw";
  const isP2Draw = state?.currentPlayer === "player2" && state.phase === "draw";
  const drawOptions = state && state.phase === "draw" ? getDrawOptions(state) : [];
  const gameOver = state ? state.deck.length === 0 : false;

  const scoreP1: PlayerScore = state ? calculatePlayerScore(state.player1Expeditions) : emptyPlayerScore;
  const scoreP2: PlayerScore = state ? calculatePlayerScore(state.player2Expeditions) : emptyPlayerScore;

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-100">Elemental Paths</h1>
        <p className="text-slate-300">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-100">Elemental Paths</h1>
        <p className="text-red-400">ゲームの取得に失敗しました</p>
        <Link href="/" className="text-indigo-300 underline">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const isHost = pid === host_id;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-100">Elemental Paths</h1>
        {isHost ? (
          <>
            <p className="text-slate-400">ゲームIDを相手に伝えて待機しています</p>
            <div className="rounded-xl bg-slate-800/95 p-6 border-2 border-slate-600 shadow-inner">
              <p className="text-xs text-slate-400 mb-1">ゲームID</p>
              <p className="text-xl font-mono font-bold text-slate-100 break-all">{gameData.id}</p>
            </div>
          </>
        ) : (
          <p className="text-slate-400">参加処理中…</p>
        )}
        <Link href="/" className="text-indigo-300 underline">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state || myRole === null) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-100">Elemental Paths</h1>
        <p className="text-slate-400">このゲームに参加していません</p>
        <Link href="/" className="text-indigo-300 underline">ロビーに戻る</Link>
      </div>
    );
  }

  const myHand = myRole === "player1" ? state.player1Hand : state.player2Hand;
  const opponentHandLength = myRole === "player1" ? state.player2Hand.length : state.player1Hand.length;
  const myExpeditions = myRole === "player1" ? state.player1Expeditions : state.player2Expeditions;
  const opponentExpeditions = myRole === "player1" ? state.player2Expeditions : state.player1Expeditions;
  const canPlayOrDiscard = isMyTurnPlay && selectedCard;
  const canDraw = isMyTurnDraw && drawOptions.length > 0;

  const handlePlayToExpedition = (color: CardColor) => {
    if (!canPlayOrDiscard || !selectedCard || selectedCard.color !== color || isSubmitting) return;
    if (myRole === "player1" && canPlayCard(state, selectedCard, "expedition", color)) {
      void applyAndSave(playCard(state, selectedCard, "expedition", color));
    }
    if (myRole === "player2") {
      void applyAndSave(playCardP2(state, selectedCard, "expedition", color));
    }
  };

  const handlePlayToDiscard = (color: CardColor) => {
    if (!canPlayOrDiscard || !selectedCard || selectedCard.color !== color || isSubmitting) return;
    if (myRole === "player1") void applyAndSave(playCard(state, selectedCard, "discard", color));
    if (myRole === "player2") void applyAndSave(playCardP2(state, selectedCard, "discard", color));
  };

  const handleDraw = (source: "deck" | CardColor) => {
    if (!canDraw || !drawOptions.includes(source) || isSubmitting) return;
    void applyAndSave(drawCard(state, source));
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4">
      {gameOver && resultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-600 max-w-2xl w-full max-h-[90vh] overflow-auto p-6 text-slate-100">
            <h2 className="text-xl font-bold text-center mb-4">ゲーム終了 — 結果</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-indigo-300 mb-2">Player 1</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-500">
                        <th className="text-left py-1 pr-2 text-slate-200">色</th>
                        <th className="text-right py-1 px-1 text-slate-200">基本点</th>
                        <th className="text-right py-1 px-1 text-slate-200">契約</th>
                        <th className="text-right py-1 px-1 text-slate-200">倍率</th>
                        <th className="text-right py-1 px-1 text-slate-200">ボーナス</th>
                        <th className="text-right py-1 pl-2 text-slate-200">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLORS.map((color) => {
                        const d = scoreP1.perColor[color];
                        return (
                          <tr key={color} className="border-b border-slate-600">
                            <td className="py-1 pr-2 text-slate-200">{COLOR_LABELS[color]}</td>
                            <td className="text-right py-1 px-1 text-slate-200">{d.base}</td>
                            <td className="text-right py-1 px-1 text-slate-200">{d.wagerCount}枚</td>
                            <td className="text-right py-1 px-1 text-slate-200">×{d.multiplier}</td>
                            <td className="text-right py-1 px-1 text-slate-200">{d.bonus}</td>
                            <td className="text-right py-1 pl-2 font-medium text-slate-100">{d.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-500 font-bold text-slate-100">
                        <td className="py-2 pr-2" colSpan={5}>合計スコア</td>
                        <td className="text-right py-2 pl-2">{scoreP1.total}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-indigo-300 mb-2">Player 2</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-500">
                        <th className="text-left py-1 pr-2 text-slate-200">色</th>
                        <th className="text-right py-1 px-1 text-slate-200">基本点</th>
                        <th className="text-right py-1 px-1 text-slate-200">契約</th>
                        <th className="text-right py-1 px-1 text-slate-200">倍率</th>
                        <th className="text-right py-1 px-1 text-slate-200">ボーナス</th>
                        <th className="text-right py-1 pl-2 text-slate-200">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLORS.map((color) => {
                        const d = scoreP2.perColor[color];
                        return (
                          <tr key={color} className="border-b border-slate-600">
                            <td className="py-1 pr-2 text-slate-200">{COLOR_LABELS[color]}</td>
                            <td className="text-right py-1 px-1 text-slate-200">{d.base}</td>
                            <td className="text-right py-1 px-1 text-slate-200">{d.wagerCount}枚</td>
                            <td className="text-right py-1 px-1 text-slate-200">×{d.multiplier}</td>
                            <td className="text-right py-1 px-1 text-slate-200">{d.bonus}</td>
                            <td className="text-right py-1 pl-2 font-medium text-slate-100">{d.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-500 font-bold text-slate-100">
                        <td className="py-2 pr-2" colSpan={5}>合計スコア</td>
                        <td className="text-right py-2 pl-2">{scoreP2.total}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <p className="text-center text-slate-300 mb-4">
              {scoreP1.total > scoreP2.total && "Player 1 の勝ち！"}
              {scoreP1.total < scoreP2.total && "Player 2 の勝ち！"}
              {scoreP1.total === scoreP2.total && "同点！"}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setResultModalOpen(false)}
                className="px-6 py-3 rounded-xl bg-slate-600 text-slate-100 font-medium hover:bg-slate-500 border border-slate-500 shadow-lg"
              >
                盤面を見る（閉じる）
              </button>
              <Link href="/" className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 border border-slate-600 shadow-lg inline-block">
                ロビーに戻る
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <h1 className="text-2xl font-bold text-center text-slate-100 drop-shadow-sm">Elemental Paths</h1>
        {gameData?.created_at && (
          <span className="text-slate-300 font-mono text-sm tabular-nums bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-600" title="プレイ時間">
            ⏱ {timerLabel}
          </span>
        )}
        {gameOver && !resultModalOpen && (
          <button
            type="button"
            onClick={() => setResultModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 border border-slate-600 shadow-lg"
          >
            結果を再表示
          </button>
        )}
        <Link href="/" className="text-slate-400 text-sm underline hover:text-indigo-300">ロビーに戻る</Link>
      </div>

      {/* 相手エリア：手札は枚数のみ・裏向き。道はソリティア風に縦重ね */}
      <section className="rounded-xl bg-slate-800/95 p-4 border-2 border-slate-600 shadow-inner">
        <p className="text-sm font-medium text-slate-200 mb-2">
          {myRole === "player1" ? "Player 2" : "Player 1"} (相手)
          {((myRole === "player1" && isP2Turn) || (myRole === "player2" && isP1Turn)) && (
            <span className="ml-2 text-amber-400 font-semibold">← 手番です</span>
          )}
          {((myRole === "player1" && isP2Draw) || (myRole === "player2" && isP1Draw)) && (
            <span className="ml-2 text-indigo-300 font-semibold">← 1枚引いてください</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <span className="text-xs text-slate-400 font-medium">手札 {opponentHandLength}枚</span>
          {Array.from({ length: opponentHandLength }).map((_, i) => (
            <Card key={i} card={{ id: `opp-${i}`, color: "red", value: 2 }} faceDown compact />
          ))}
        </div>
        <p className="text-xs text-slate-400 mb-1 font-medium">プレイしたカード</p>
        <div className="flex flex-wrap gap-4">
          {COLORS.map((color) => {
            const pts = myRole === "player1" ? scoreP2.perColor[color].total : scoreP1.perColor[color].total;
            return (
              <div key={color} className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-slate-300 font-medium">{COLOR_LABELS[color]}</span>
                <span className={`text-sm font-bold tabular-nums min-h-[1.5rem] flex items-center justify-center ${pts > 0 ? "text-emerald-400" : pts < 0 ? "text-red-400" : "text-slate-500"}`}>
                  {pts > 0 ? `+${pts}` : pts}点
                </span>
                <div className="flex flex-col items-center min-h-[2.5rem] min-w-[2.25rem] rounded-lg border-2 border-dashed border-slate-500 p-1 bg-slate-700/50">
                  {opponentExpeditions[color].map((c, i) => (
                    <div key={c.id} className={i === 0 ? "" : "-mt-10"}>
                      <Card card={c} compact />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 捨て札モーダル：その色の捨て札をすべて表示・拾う/捨てる */}
      {discardModalColor !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDiscardModalColor(null)}>
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-600 max-w-lg w-full max-h-[85vh] overflow-auto p-6 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2">{COLOR_LABELS[discardModalColor]} の捨て札</h2>
            <p className="text-xs text-slate-400 mb-3">捨てられた順（下が古い・上が一番上）</p>
            <div className="flex flex-wrap gap-2 mb-4 min-h-[4rem]">
              {/* 配列は [古い…新しい]。表示は古い→新しいの順で並べる */}
              {(state.discardPiles[discardModalColor] ?? []).map((c) => (
                <Card key={c.id} card={c} compact />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {isMyTurnDraw && drawOptions.includes(discardModalColor) && state.discardPiles[discardModalColor].length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    handleDraw(discardModalColor);
                    setDiscardModalColor(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 border border-slate-600 disabled:opacity-50"
                >
                  拾う（Draw）
                </button>
              )}
              {isMyTurnPlay && selectedCard?.color === discardModalColor && (
                <button
                  type="button"
                  onClick={() => {
                    if (myRole === "player1") void applyAndSave(playCard(state, selectedCard!, "discard", discardModalColor));
                    if (myRole === "player2") void applyAndSave(playCardP2(state, selectedCard!, "discard", discardModalColor));
                    setDiscardModalColor(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-slate-600 text-slate-100 font-medium hover:bg-slate-500 border border-slate-500 disabled:opacity-50"
                >
                  ここに捨てる
                </button>
              )}
              <button
                type="button"
                onClick={() => setDiscardModalColor(null)}
                className="px-4 py-2 rounded-lg bg-slate-600 text-slate-200 font-medium hover:bg-slate-500 border border-slate-500"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 中央: 捨て札・山札 */}
      <section className="rounded-xl bg-slate-800/95 p-4 border-2 border-slate-600 shadow-inner flex flex-wrap items-end gap-6">
        <div className="flex items-end gap-4">
          {COLORS.map((color) => {
            const canDrawFromThis = canDraw && drawOptions.includes(color);
            const topCard = state.discardPiles[color].length > 0 ? state.discardPiles[color][state.discardPiles[color].length - 1] : null;
            const canDiscardHere = canPlayOrDiscard && selectedCard?.color === color;
            const hasCards = (state.discardPiles[color] ?? []).length > 0;
            return (
              <div key={color} className="flex flex-col items-center">
                <span className="text-xs text-slate-300 mb-1 font-medium">{COLOR_LABELS[color]} 捨て札</span>
                <div
                  className={`min-h-[3rem] min-w-[3.5rem] rounded-lg border-2 border-dashed border-slate-500 flex flex-wrap gap-0.5 p-1 items-end justify-center cursor-pointer ${canDiscardHere ? "bg-slate-600 ring-2 ring-indigo-400" : "bg-slate-700/50"} ${(canDrawFromThis || hasCards) ? "hover:bg-slate-600 hover:ring-2 hover:ring-indigo-400" : ""}`}
                  onClick={() => setDiscardModalColor(color)}
                  role="button"
                  aria-label={`${COLOR_LABELS[color]}の捨て札を確認`}
                >
                  {topCard && <Card card={topCard} compact />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-300 mb-1 font-medium">山札</span>
          <button
            type="button"
            onClick={() => handleDraw("deck")}
            disabled={!canDraw || !drawOptions.includes("deck")}
            className={`h-20 w-14 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all ${canDraw && drawOptions.includes("deck") ? "border-slate-500 bg-slate-600 text-slate-100 cursor-pointer hover:bg-slate-500 shadow-lg" : "border-slate-600 bg-slate-700 text-slate-500 cursor-default"}`}
          >
            {state.deck.length}
          </button>
        </div>
      </section>

      {/* 自分エリア：ソリティア風カード配置・リアルタイム得点・ターン表示 */}
      <section className="rounded-xl bg-slate-800/95 p-4 border-2 border-slate-600 shadow-inner flex-1">
        <p className="text-sm font-medium text-slate-200 mb-2">
          {myRole === "player1" ? "Player 1" : "Player 2"} (自分)
          {isMyTurnPlay && <span className="ml-2 text-amber-400 font-semibold">← 手番です。手札を選んでから置き場をクリック</span>}
          {isMyTurnDraw && <span className="ml-2 text-indigo-300 font-semibold">← 1枚引いてください</span>}
        </p>
        <p className="text-xs text-slate-400 mb-1 font-medium">自分の道（属性ごとに昇順で置く）</p>
        <div className="flex flex-wrap gap-4 mb-4">
          {COLORS.map((color) => {
            const myPts = myRole === "player1" ? scoreP1.perColor[color].total : scoreP2.perColor[color].total;
            return (
              <div key={color} className="flex flex-col items-center">
                <span className="text-xs text-slate-300 font-medium">{COLOR_LABELS[color]}</span>
                <span className={`text-sm font-bold tabular-nums min-h-[1.5rem] flex items-center justify-center ${myPts > 0 ? "text-emerald-400" : myPts < 0 ? "text-red-400" : "text-slate-500"}`}>
                  {myPts > 0 ? `+${myPts}` : myPts}点
                </span>
                <div
                  className={`min-h-[4rem] min-w-[2.25rem] rounded-lg border-2 border-dashed border-slate-500 p-1 flex flex-col items-center ${canPlayOrDiscard && selectedCard?.color === color ? "bg-slate-600 ring-2 ring-indigo-400" : "bg-slate-700/50"}`}
                  onClick={() => isMyTurnPlay && selectedCard && handlePlayToExpedition(color)}
                  role={canPlayOrDiscard ? "button" : undefined}
                >
                  {myExpeditions[color].map((c, i) => (
                    <div key={c.id} className={i === 0 ? "" : "-mt-10"}>
                      <Card card={c} compact />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mb-1 font-medium">手札（クリックで選択 → 置き場をクリック）</p>
        <div className="flex flex-wrap gap-2">
          {myHand.map((c) => {
            const isSelected = selectedCard?.id === c.id;
            return (
              <div key={c.id} className="relative">
                <Card
                  card={c}
                  selected={isSelected}
                  onClick={() => isMyTurnPlay && !isSubmitting && setSelectedCard(c)}
                />
                {isSelected && isSubmitting && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 pointer-events-none">
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {isMyTurnDraw && drawOptions.length > 0 && (
          <p className="mt-3 text-sm text-slate-300 font-medium">
            山札または捨て札の一番上のカードをクリックして1枚引いてください
          </p>
        )}
      </section>

      {/* 行動履歴ログ（最新5件） */}
      {(state.logs ?? []).length > 0 && (
        <section className="rounded-lg bg-slate-800/80 p-3 border border-slate-600">
          <p className="text-xs text-slate-400 font-medium mb-1.5">行動履歴</p>
          <ul className="text-sm text-slate-300 space-y-0.5 font-mono">
            {(state.logs ?? []).slice(-5).map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-center text-slate-500 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-100">Elemental Paths</h1>
          <p className="text-slate-300">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
