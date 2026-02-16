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
  createInitialState,
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
  const [showRules, setShowRules] = useState(false);
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

  const handleRematch = useCallback(async () => {
    if (!gameId) return;
    setIsSubmitting(true);
    try {
      const initialState = createInitialState();
      await updateGameState(gameId, initialState);
      setResultModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
        <h1 className="text-2xl font-bold text-stone-900">Elemental Paths</h1>
        <p className="text-stone-600">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
        <h1 className="text-2xl font-bold text-stone-900">Elemental Paths</h1>
        <p className="text-red-600">ゲームの取得に失敗しました</p>
        <Link href="/" className="text-amber-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const isHost = pid === host_id;
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
        <h1 className="text-2xl font-bold text-stone-900">Elemental Paths</h1>
        {isHost ? (
          <>
            <p className="text-stone-600">ゲームIDを相手に伝えて待機しています</p>
            <div className="rounded-xl bg-orange-50 p-6 border-4 border-amber-700/50 shadow-lg">
              <p className="text-xs text-stone-500 mb-1">ゲームID</p>
              <p className="text-xl font-mono font-bold text-stone-900 break-all">{gameData.id}</p>
            </div>
          </>
        ) : (
          <p className="text-stone-600">参加処理中…</p>
        )}
        <Link href="/" className="text-amber-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state || myRole === null) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
        <h1 className="text-2xl font-bold text-stone-900">Elemental Paths</h1>
        <p className="text-stone-600">このゲームに参加していません</p>
        <Link href="/" className="text-amber-600 underline font-medium">ロビーに戻る</Link>
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

  const selfScore = myRole === "player1" ? scoreP1 : scoreP2;
  const opponentScore = myRole === "player1" ? scoreP2 : scoreP1;
  const selfTotal = selfScore.total;
  const opponentTotal = opponentScore.total;

  const formatLogLine = (log: string, index: number) => {
    const n = index + 1;
    const who = log.startsWith("P1:") ? (myRole === "player1" ? "自分" : "相手") : (myRole === "player1" ? "相手" : "自分");
    const text = log.replace(/^P[12]:/, "");
    return `[${n}手前] ${who}: ${text}`;
  };
  const displayLogs = (state.logs ?? []).slice(-3).reverse();

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 bg-gradient-to-b from-stone-100 to-orange-50/60">
      {gameOver && resultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4">
          <div className="bg-stone-100 rounded-2xl shadow-2xl border-4 border-amber-700/60 max-w-2xl w-full max-h-[90vh] overflow-auto p-6 text-stone-900">
            <h2 className="text-xl font-bold text-center mb-4 text-amber-800">ゲーム終了 — 結果</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl bg-blue-50 p-4 border-4 border-amber-800/40 shadow-md">
                <h3 className="font-semibold text-blue-800 mb-2">自分</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-amber-800/30">
                        <th className="text-left py-1 pr-2 text-stone-700">色</th>
                        <th className="text-right py-1 px-1 text-stone-700">基本点</th>
                        <th className="text-right py-1 px-1 text-stone-700">契約</th>
                        <th className="text-right py-1 px-1 text-stone-700">倍率</th>
                        <th className="text-right py-1 px-1 text-stone-700">ボーナス</th>
                        <th className="text-right py-1 pl-2 text-stone-700">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLORS.map((color) => {
                        const d = selfScore.perColor[color];
                        return (
                          <tr key={color} className="border-b border-amber-800/20">
                            <td className="py-1 pr-2 text-stone-800">{COLOR_LABELS[color]}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.base}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.wagerCount}枚</td>
                            <td className="text-right py-1 px-1 text-stone-800">×{d.multiplier}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.bonus}</td>
                            <td className="text-right py-1 pl-2 font-medium text-stone-900">{d.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-amber-800/40 font-bold text-stone-900">
                        <td className="py-2 pr-2" colSpan={5}>合計スコア</td>
                        <td className="text-right py-2 pl-2">{selfTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="rounded-xl bg-red-50 p-4 border-4 border-amber-800/40 shadow-md">
                <h3 className="font-semibold text-red-800 mb-2">相手</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-amber-800/30">
                        <th className="text-left py-1 pr-2 text-stone-700">色</th>
                        <th className="text-right py-1 px-1 text-stone-700">基本点</th>
                        <th className="text-right py-1 px-1 text-stone-700">契約</th>
                        <th className="text-right py-1 px-1 text-stone-700">倍率</th>
                        <th className="text-right py-1 px-1 text-stone-700">ボーナス</th>
                        <th className="text-right py-1 pl-2 text-stone-700">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLORS.map((color) => {
                        const d = opponentScore.perColor[color];
                        return (
                          <tr key={color} className="border-b border-amber-800/20">
                            <td className="py-1 pr-2 text-stone-800">{COLOR_LABELS[color]}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.base}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.wagerCount}枚</td>
                            <td className="text-right py-1 px-1 text-stone-800">×{d.multiplier}</td>
                            <td className="text-right py-1 px-1 text-stone-800">{d.bonus}</td>
                            <td className="text-right py-1 pl-2 font-medium text-stone-900">{d.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-amber-800/40 font-bold text-stone-900">
                        <td className="py-2 pr-2" colSpan={5}>合計スコア</td>
                        <td className="text-right py-2 pl-2">{opponentTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <p className="text-center text-stone-700 mb-4 font-medium">
              {selfTotal > opponentTotal && "自分の勝ち！"}
              {selfTotal < opponentTotal && "相手の勝ち！"}
              {selfTotal === opponentTotal && "同点！"}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleRematch}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-500 border-2 border-amber-700 shadow-lg disabled:opacity-50"
              >
                もう一度遊ぶ（再戦）
              </button>
              <button
                type="button"
                onClick={() => setResultModalOpen(false)}
                className="px-6 py-3 rounded-xl bg-stone-500 text-white font-medium hover:bg-stone-400 border-2 border-stone-600 shadow-lg"
              >
                盤面を見る（閉じる）
              </button>
              <Link href="/" className="px-6 py-3 rounded-xl bg-amber-700 text-white font-medium hover:bg-amber-600 border-2 border-amber-800 shadow-lg inline-block">
                ロビーに戻る
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-row flex-wrap items-center justify-between gap-2 sm:gap-4 w-full">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <h1 className="text-2xl font-bold text-center text-stone-900 drop-shadow-sm">Elemental Paths</h1>
          {gameData?.created_at && (
            <span className="text-stone-700 font-mono text-sm tabular-nums bg-stone-200/90 px-3 py-1.5 rounded-lg border-2 border-amber-700/50 shadow" title="プレイ時間">
              ⏱ {timerLabel}
            </span>
          )}
          {gameOver && !resultModalOpen && (
            <button
              type="button"
              onClick={() => setResultModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 border-2 border-amber-700 shadow-lg"
            >
              結果を再表示
            </button>
          )}
          <Link href="/" className="text-stone-600 text-sm underline hover:text-amber-600 font-medium">ロビーに戻る</Link>
        </div>
        <button
          type="button"
          onClick={() => setShowRules(true)}
          className="px-3 py-1.5 rounded-lg border-2 border-amber-600 text-amber-700 font-medium hover:bg-amber-50 text-sm shadow"
        >
          ？ ルール
        </button>
      </div>

      {/* ルールモーダル（ロビーと同じ内容） */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
          <div className="bg-stone-100 text-stone-900 rounded-2xl border-4 border-amber-700/60 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-amber-100/80 p-4 border-b-4 border-amber-700/50 flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-bold text-amber-800">精霊の道 — ルール</h2>
              <button onClick={() => setShowRules(false)} className="p-1 hover:bg-amber-200/80 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-sm md:text-base leading-relaxed">
              <section>
                <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-700/40 pb-1">目的</h3>
                <p className="text-stone-700">
                  5つの属性（<span className="text-red-500">火</span>・<span className="text-blue-500">水</span>・<span className="text-emerald-600">風</span>・<span className="text-amber-600">土</span>・<span className="text-stone-500">光</span>）の「道」にカードを並べ、スコアを競います。<br />
                  各道には<span className="text-red-600 font-bold">コスト（-20点）</span>がかかります。途中で止めると赤字になります。
                </p>
              </section>
              <section>
                <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-700/40 pb-1">カードの種類と出し方</h3>
                <ul className="list-disc pl-5 space-y-2 text-stone-700">
                  <li>
                    <span className="font-bold text-stone-900">数字カード (2〜10):</span><br />
                    自分の道に出すときは、<span className="text-amber-700 font-bold">小さい数字から大きい数字の順（昇順）</span>にしか出せません。
                  </li>
                  <li>
                    <span className="font-bold text-stone-900">契約カード (🤝):</span><br />
                    得点を倍にするカードです。<span className="text-amber-700 font-bold">数字カードを出す前</span>にのみ出せます。1枚で2倍、2枚で3倍、3枚で4倍。
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-700/40 pb-1">ターンの流れ</h3>
                <ol className="list-decimal pl-5 space-y-2 text-stone-700">
                  <li><span className="font-bold text-stone-900">カードを1枚出す:</span> 自分の道に置くか、捨て札置き場に捨てる。</li>
                  <li><span className="font-bold text-stone-900">カードを1枚引く:</span> 山札か、自分が捨てた属性以外の捨て札から引く。</li>
                </ol>
              </section>
              <section>
                <h3 className="text-amber-800 font-bold mb-2 text-lg border-b-2 border-amber-700/40 pb-1">得点計算</h3>
                <div className="bg-stone-200/80 p-3 rounded border-2 border-amber-700/40 font-mono text-sm text-stone-800">
                  (数字の合計 - 20) × (契約の枚数 + 1)
                </div>
                <p className="text-stone-700 mt-2 text-xs">
                  道に8枚以上あるとボーナス <span className="text-emerald-600">+20点</span>。1枚も置いていない道は 0点です。
                </p>
              </section>
            </div>
            <div className="bg-amber-100/80 p-4 border-t-4 border-amber-700/50 text-center">
              <button
                onClick={() => setShowRules(false)}
                className="px-8 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors shadow-lg border-2 border-amber-700"
              >
                理解した！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 相手エリア：赤系アクセント */}
      <section className="rounded-xl bg-red-50/90 p-4 border-4 border-amber-800/50 shadow-lg">
        <p className="text-sm font-medium text-stone-800 mb-2">
          相手
          {((myRole === "player1" && isP2Turn) || (myRole === "player2" && isP1Turn)) && (
            <span className="ml-2 text-amber-600 font-semibold">← 手番です</span>
          )}
          {((myRole === "player1" && isP2Draw) || (myRole === "player2" && isP1Draw)) && (
            <span className="ml-2 text-yellow-600 font-semibold">← 1枚引いてください</span>
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
                <span className={`text-sm font-bold tabular-nums min-h-[1.5rem] flex items-center justify-center ${pts > 0 ? "text-emerald-600" : pts < 0 ? "text-red-600" : "text-stone-500"}`}>
                  {pts > 0 ? `+${pts}` : pts}点
                </span>
                <div className="flex flex-col items-center min-h-[2.5rem] min-w-[2.25rem] rounded-lg border-4 border-dashed border-amber-800/40 p-1 bg-stone-200/80">
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

      {/* 中央: 捨て札・山札（クリックで即ドロー or 即捨て） */}
      <section className="rounded-xl bg-stone-200/80 p-4 border-4 border-amber-800/60 shadow-lg flex flex-wrap items-end gap-6">
        <div className="flex items-end gap-4">
          {COLORS.map((color) => {
            const canDrawFromThis = canDraw && drawOptions.includes(color);
            const topCard = state.discardPiles[color].length > 0 ? state.discardPiles[color][state.discardPiles[color].length - 1] : null;
            const canDiscardHere = canPlayOrDiscard && selectedCard?.color === color;
            return (
              <div key={color} className="flex flex-col items-center">
                <span className="text-xs text-stone-700 mb-1 font-medium">{COLOR_LABELS[color]} 捨て札</span>
                <div
                  className={`min-h-[3rem] min-w-[3.5rem] rounded-lg border-4 border-dashed border-amber-800/50 flex flex-wrap gap-0.5 p-1 items-end justify-center bg-stone-300/80 ${canDiscardHere ? "ring-2 ring-amber-600 ring-offset-2" : ""} ${canDrawFromThis ? "cursor-pointer hover:bg-amber-100/80" : canDiscardHere ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (canDrawFromThis) handleDraw(color);
                    if (canDiscardHere) handlePlayToDiscard(color);
                  }}
                  role={(canDiscardHere || canDrawFromThis) ? "button" : undefined}
                  aria-label={canDrawFromThis ? `${COLOR_LABELS[color]}の捨て札から引く` : canDiscardHere ? `${COLOR_LABELS[color]}に捨てる` : undefined}
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
            className={`h-20 w-14 rounded-lg border-4 flex items-center justify-center text-sm font-bold transition-all shadow-lg ${canDraw && drawOptions.includes("deck") ? "border-amber-700 bg-amber-600 text-white cursor-pointer hover:bg-amber-500" : "border-amber-800/40 bg-stone-300 text-stone-500 cursor-default"}`}
          >
            {state.deck.length}
          </button>
        </div>
      </section>

      {/* 自分エリア：青・緑系アクセント */}
      <section className="rounded-xl bg-blue-50/90 p-4 border-4 border-amber-800/50 shadow-lg flex-1">
        <p className="text-sm font-medium text-stone-800 mb-2">
          自分
          {isMyTurnPlay && <span className="ml-2 text-amber-600 font-semibold">← 手番です。手札を選んでから置き場をクリック</span>}
          {isMyTurnDraw && <span className="ml-2 text-yellow-600 font-semibold">← 1枚引いてください</span>}
        </p>
        <p className="text-xs text-stone-600 mb-1 font-medium">自分の道（属性ごとに昇順で置く）</p>
        <div className="flex flex-wrap gap-4 mb-4">
          {COLORS.map((color) => {
            const myPts = myRole === "player1" ? scoreP1.perColor[color].total : scoreP2.perColor[color].total;
            return (
              <div key={color} className="flex flex-col items-center">
                <span className="text-xs text-stone-700 font-medium">{COLOR_LABELS[color]}</span>
                <span className={`text-sm font-bold tabular-nums min-h-[1.5rem] flex items-center justify-center ${myPts > 0 ? "text-emerald-600" : myPts < 0 ? "text-red-600" : "text-stone-500"}`}>
                  {myPts > 0 ? `+${myPts}` : myPts}点
                </span>
                <div
                  className={`min-h-[4rem] min-w-[2.25rem] rounded-lg border-4 border-dashed border-amber-800/40 p-1 flex flex-col items-center bg-stone-200/80 ${canPlayOrDiscard && selectedCard?.color === color ? "ring-2 ring-amber-600 ring-offset-2" : ""}`}
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
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-stone-900/50 pointer-events-none">
                    <svg className="animate-spin h-6 w-6 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
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
          <p className="mt-3 text-sm text-stone-600 font-medium">
            山札または捨て札の一番上をクリックして1枚引いてください
          </p>
        )}
      </section>

      {/* 行動履歴ログ（最新3件・日本語・何手前） */}
      {displayLogs.length > 0 && (
        <section className="rounded-lg bg-stone-200/90 p-3 border-2 border-amber-800/40 shadow-inner">
          <p className="text-xs text-stone-600 font-medium mb-1.5">行動履歴</p>
          <ul className="text-sm text-stone-800 space-y-0.5">
            {displayLogs.map((log, i) => (
              <li key={i}>{formatLogLine(log, i)}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-center text-stone-500 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
          <h1 className="text-2xl font-bold text-stone-900">Elemental Paths</h1>
          <p className="text-stone-600">読み込み中…</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
