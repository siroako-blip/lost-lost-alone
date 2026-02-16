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
  const prevDeckLength = useRef<number | null>(null);

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
    (nextState: GameState) => {
      if (!gameId) return;
      const toSave = { ...nextState, selectedCard: null };
      updateGameState(gameId, toSave);
      setSelectedCard(null);
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
  const gameOver = state?.deck.length === 0;

  const scoreP1: PlayerScore = state ? calculatePlayerScore(state.player1Expeditions) : emptyPlayerScore;
  const scoreP2: PlayerScore = state ? calculatePlayerScore(state.player2Expeditions) : emptyPlayerScore;

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
        <h1 className="text-2xl font-bold text-amber-100">Lost Cities</h1>
        <p className="text-amber-200/90">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
        <h1 className="text-2xl font-bold text-amber-100">Lost Cities</h1>
        <p className="text-red-400">ゲームの取得に失敗しました</p>
        <Link href="/" className="text-amber-200 underline">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const isHost = pid === host_id;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
        <h1 className="text-2xl font-bold text-amber-100">Lost Cities</h1>
        {isHost ? (
          <>
            <p className="text-amber-200/90">ゲームIDを相手に伝えて待機しています</p>
            <div className="rounded-xl bg-amber-50/95 p-6 border-2 border-amber-800 shadow-inner">
              <p className="text-xs text-stone-600 mb-1">ゲームID</p>
              <p className="text-xl font-mono font-bold text-stone-800 break-all">{gameData.id}</p>
            </div>
          </>
        ) : (
          <p className="text-amber-200/90">参加処理中…</p>
        )}
        <Link href="/" className="text-amber-200 underline">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state || myRole === null) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
        <h1 className="text-2xl font-bold text-amber-100">Lost Cities</h1>
        <p className="text-amber-200/90">このゲームに参加していません</p>
        <Link href="/" className="text-amber-200 underline">ロビーに戻る</Link>
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
    if (!canPlayOrDiscard || !selectedCard || selectedCard.color !== color) return;
    if (myRole === "player1" && canPlayCard(state, selectedCard, "expedition", color)) {
      applyAndSave(playCard(state, selectedCard, "expedition", color));
    }
    if (myRole === "player2") {
      applyAndSave(playCardP2(state, selectedCard, "expedition", color));
    }
  };

  const handlePlayToDiscard = (color: CardColor) => {
    if (!canPlayOrDiscard || !selectedCard || selectedCard.color !== color) return;
    if (myRole === "player1") applyAndSave(playCard(state, selectedCard, "discard", color));
    if (myRole === "player2") applyAndSave(playCardP2(state, selectedCard, "discard", color));
  };

  const handleDraw = (source: "deck" | CardColor) => {
    if (!canDraw || !drawOptions.includes(source)) return;
    applyAndSave(drawCard(state, source));
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4">
      {gameOver && resultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-amber-50 rounded-2xl shadow-2xl border-2 border-amber-800 max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <h2 className="text-xl font-bold text-center text-stone-800 mb-4">ゲーム終了 — 結果</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-sky-700 mb-2">Player 1</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-1 pr-2">色</th>
                        <th className="text-right py-1 px-1">基本点</th>
                        <th className="text-right py-1 px-1">賭け</th>
                        <th className="text-right py-1 px-1">倍率</th>
                        <th className="text-right py-1 px-1">ボーナス</th>
                        <th className="text-right py-1 pl-2">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLORS.map((color) => {
                        const d = scoreP1.perColor[color];
                        return (
                          <tr key={color} className="border-b border-stone-100">
                            <td className="py-1 pr-2">{COLOR_LABELS[color]}</td>
                            <td className="text-right py-1 px-1">{d.base}</td>
                            <td className="text-right py-1 px-1">{d.wagerCount}枚</td>
                            <td className="text-right py-1 px-1">×{d.multiplier}</td>
                            <td className="text-right py-1 px-1">{d.bonus}</td>
                            <td className="text-right py-1 pl-2 font-medium">{d.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-stone-300 font-bold">
                        <td className="py-2 pr-2" colSpan={5}>合計スコア</td>
                        <td className="text-right py-2 pl-2">{scoreP1.total}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-amber-700 mb-2">Player 2</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-1 pr-2">色</th>
                        <th className="text-right py-1 px-1">基本点</th>
                        <th className="text-right py-1 px-1">賭け</th>
                        <th className="text-right py-1 px-1">倍率</th>
                        <th className="text-right py-1 px-1">ボーナス</th>
                        <th className="text-right py-1 pl-2">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLORS.map((color) => {
                        const d = scoreP2.perColor[color];
                        return (
                          <tr key={color} className="border-b border-stone-100">
                            <td className="py-1 pr-2">{COLOR_LABELS[color]}</td>
                            <td className="text-right py-1 px-1">{d.base}</td>
                            <td className="text-right py-1 px-1">{d.wagerCount}枚</td>
                            <td className="text-right py-1 px-1">×{d.multiplier}</td>
                            <td className="text-right py-1 px-1">{d.bonus}</td>
                            <td className="text-right py-1 pl-2 font-medium">{d.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-stone-300 font-bold">
                        <td className="py-2 pr-2" colSpan={5}>合計スコア</td>
                        <td className="text-right py-2 pl-2">{scoreP2.total}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <p className="text-center text-stone-600 mb-4">
              {scoreP1.total > scoreP2.total && "Player 1 の勝ち！"}
              {scoreP1.total < scoreP2.total && "Player 2 の勝ち！"}
              {scoreP1.total === scoreP2.total && "同点！"}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setResultModalOpen(false)}
                className="px-6 py-3 rounded-xl bg-stone-600 text-amber-50 font-medium hover:bg-stone-500 border border-amber-800 shadow-lg"
              >
                盤面を見る（閉じる）
              </button>
              <Link href="/" className="px-6 py-3 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-500 border border-amber-800 shadow-lg inline-block">
                ロビーに戻る
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        <h1 className="text-2xl font-bold text-center text-amber-100 drop-shadow-sm">Lost Cities</h1>
        {gameOver && !resultModalOpen && (
          <button
            type="button"
            onClick={() => setResultModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-amber-600 text-amber-50 text-sm font-medium hover:bg-amber-500 border border-amber-700 shadow-lg"
          >
            結果を再表示
          </button>
        )}
        <Link href="/" className="text-amber-200/90 text-sm underline">ロビーに戻る</Link>
      </div>

      {/* 相手エリア：手札は枚数のみ・裏向き。遠征路はソリティア風に縦重ね */}
      <section className="rounded-xl bg-amber-50/95 p-4 border-2 border-amber-800 shadow-inner shadow-stone-900/20">
        <p className="text-sm font-medium text-stone-800 mb-2">
          {myRole === "player1" ? "Player 2" : "Player 1"} (相手)
          {((myRole === "player1" && isP2Turn) || (myRole === "player2" && isP1Turn)) && (
            <span className="ml-2 text-amber-700 font-semibold">← 手番です</span>
          )}
          {((myRole === "player1" && isP2Draw) || (myRole === "player2" && isP1Draw)) && (
            <span className="ml-2 text-blue-700 font-semibold">← 1枚引いてください</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <span className="text-xs text-stone-600 font-medium">手札 {opponentHandLength}枚</span>
          {Array.from({ length: opponentHandLength }).map((_, i) => (
            <Card key={i} card={{ id: `opp-${i}`, color: "red", value: 2 }} faceDown compact />
          ))}
        </div>
        <p className="text-xs text-stone-600 mb-1 font-medium">プレイしたカード</p>
        <div className="flex flex-wrap gap-4">
          {COLORS.map((color) => {
            const pts = myRole === "player1" ? scoreP2.perColor[color].total : scoreP1.perColor[color].total;
            return (
              <div key={color} className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-stone-700 font-medium">{COLOR_LABELS[color]}</span>
                <span className={`text-sm font-bold tabular-nums min-h-[1.5rem] flex items-center justify-center ${pts > 0 ? "text-green-600" : pts < 0 ? "text-red-600" : "text-stone-500"}`}>
                  {pts > 0 ? `+${pts}` : pts}点
                </span>
                <div className="flex flex-col items-center min-h-[2.5rem] min-w-[2.25rem] rounded-lg border-2 border-dashed border-amber-700/60 p-1 bg-stone-200/60">
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

      {/* 中央: 捨て札・山札 */}
      <section className="rounded-xl bg-amber-50/95 p-4 border-2 border-amber-800 shadow-inner flex flex-wrap items-end gap-6">
        <div className="flex items-end gap-4">
          {COLORS.map((color) => {
            const canDrawFromThis = canDraw && drawOptions.includes(color);
            const topCard = state.discardPiles[color].length > 0 ? state.discardPiles[color][state.discardPiles[color].length - 1] : null;
            const canDiscardHere = canPlayOrDiscard && selectedCard?.color === color;
            return (
              <div key={color} className="flex flex-col items-center">
                <span className="text-xs text-stone-700 mb-1 font-medium">{COLOR_LABELS[color]} 捨て札</span>
                <div
                  className={`min-h-[3rem] min-w-[3.5rem] rounded-lg border-2 border-dashed border-stone-500 flex flex-wrap gap-0.5 p-1 items-end justify-center ${canDiscardHere ? "bg-amber-100 ring-2 ring-amber-500" : "bg-stone-200/80"} ${canDrawFromThis ? "cursor-pointer ring-2 ring-amber-400 hover:ring-amber-500 hover:bg-amber-100/80" : ""}`}
                  onClick={() => {
                    if (canDiscardHere) handlePlayToDiscard(color);
                    if (canDrawFromThis) handleDraw(color);
                  }}
                  role={(canDiscardHere || canDrawFromThis) ? "button" : undefined}
                >
                  {topCard && <Card card={topCard} compact />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-stone-700 mb-1 font-medium">山札</span>
          <button
            type="button"
            onClick={() => handleDraw("deck")}
            disabled={!canDraw || !drawOptions.includes("deck")}
            className={`h-20 w-14 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all ${canDraw && drawOptions.includes("deck") ? "border-amber-700 bg-stone-600 text-amber-100 cursor-pointer hover:bg-stone-500 hover:border-amber-600 shadow-lg" : "border-stone-600 bg-stone-700 text-stone-400 cursor-default"}`}
          >
            {state.deck.length}
          </button>
        </div>
      </section>

      {/* 自分エリア：ソリティア風カード配置・リアルタイム得点・ターン表示 */}
      <section className="rounded-xl bg-amber-50/95 p-4 border-2 border-amber-800 shadow-inner shadow-stone-900/20 flex-1">
        <p className="text-sm font-medium text-stone-800 mb-2">
          {myRole === "player1" ? "Player 1" : "Player 2"} (自分)
          {isMyTurnPlay && <span className="ml-2 text-amber-700 font-semibold">← 手番です。手札を選んでから置き場をクリック</span>}
          {isMyTurnDraw && <span className="ml-2 text-blue-700 font-semibold">← 1枚引いてください</span>}
        </p>
        <p className="text-xs text-stone-600 mb-1 font-medium">自分の遠征路（色ごとに昇順で置く）</p>
        <div className="flex flex-wrap gap-4 mb-4">
          {COLORS.map((color) => {
            const myPts = myRole === "player1" ? scoreP1.perColor[color].total : scoreP2.perColor[color].total;
            return (
              <div key={color} className="flex flex-col items-center">
                <span className="text-xs text-stone-700 font-medium">{COLOR_LABELS[color]}</span>
                <span className={`text-sm font-bold tabular-nums min-h-[1.5rem] flex items-center justify-center ${myPts > 0 ? "text-green-600" : myPts < 0 ? "text-red-600" : "text-stone-500"}`}>
                  {myPts > 0 ? `+${myPts}` : myPts}点
                </span>
                <div
                  className={`min-h-[4rem] min-w-[2.25rem] rounded-lg border-2 border-dashed border-amber-700/60 p-1 flex flex-col items-center ${canPlayOrDiscard && selectedCard?.color === color ? "bg-amber-100 ring-2 ring-amber-500" : "bg-stone-200/60"}`}
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
        <p className="text-xs text-stone-600 mb-1 font-medium">手札（クリックで選択 → 置き場をクリック）</p>
        <div className="flex flex-wrap gap-2">
          {myHand.map((c) => (
            <Card
              key={c.id}
              card={c}
              selected={selectedCard?.id === c.id}
              onClick={() => isMyTurnPlay && setSelectedCard(c)}
            />
          ))}
        </div>
        {isMyTurnDraw && drawOptions.length > 0 && (
          <p className="mt-3 text-sm text-amber-800 font-medium">
            山札または捨て札の一番上のカードをクリックして1枚引いてください
          </p>
        )}
      </section>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center">
          <h1 className="text-2xl font-bold text-amber-100">Lost Cities</h1>
          <p className="text-amber-200/90">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
