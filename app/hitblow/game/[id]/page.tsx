"use client";

import { useCallback, useState, useRef, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { HitBlowGameState } from "@/app/hitBlowTypes";
import { setSecret, submitGuess, isValidGuess, getMergedHistory } from "@/app/hitBlowLogic";
import { useHitBlowRealtime } from "@/lib/useHitBlowRealtime";
import { usePresence } from "@/lib/usePresence";
import { updateHitBlowGameState } from "@/lib/gameDb";

type PlayerRole = "player1" | "player2" | "spectator";

function CopyButton({ text, className }: { text: string; className?: string }) {
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
      className={className ?? "px-2 py-1 rounded border border-amber-700/60 bg-amber-50 hover:bg-amber-100 text-stone-700 text-sm font-medium"}
    >
      {copied ? "コピーしました" : "📋 コピー"}
    </button>
  );
}

function HitBlowGameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = typeof params.id === "string" ? params.id : null;
  const pid = searchParams.get("pid") ?? "";

  const { gameData, loading, error } = useHitBlowRealtime(gameId);
  const hostId = gameData?.player1_id ?? null;
  const guestId = gameData?.player2_id ?? null;
  const { opponentStatus, player1Status, player2Status } = usePresence(
    gameId,
    pid || null,
    hostId,
    guestId
  );
  const [guessInput, setGuessInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false);
  const [showReconnectMessage, setShowReconnectMessage] = useState(false);
  const prevOpponentStatus = useRef<"online" | "offline" | null>(null);
  const hasSeenOpponentOnline = useRef(false);
  const state: HitBlowGameState | null = gameData?.game_state ?? null;
  const myRole: PlayerRole =
    pid && hostId && pid === hostId
      ? "player1"
      : pid && guestId && pid === guestId
        ? "player2"
        : "spectator";

  useEffect(() => {
    if (opponentStatus === null) return;
    if (opponentStatus === "online") hasSeenOpponentOnline.current = true;
    const prev = prevOpponentStatus.current;
    prevOpponentStatus.current = opponentStatus;
    if (prev === "online" && opponentStatus === "offline" && hasSeenOpponentOnline.current) {
      setShowDisconnectBanner(true);
      setShowReconnectMessage(false);
    }
    if (prev === "offline" && opponentStatus === "online") {
      setShowDisconnectBanner(false);
      setShowReconnectMessage(true);
      const t = setTimeout(() => setShowReconnectMessage(false), 3000);
      return () => clearTimeout(t);
    }
  }, [opponentStatus]);

  const handleSetSecret = useCallback(async () => {
    if (myRole === "spectator") return;
    if (!gameId || !state || state.phase !== "setup" || !isValidGuess(secretInput)) return;
    const next = setSecret(state, myRole, secretInput);
    setIsSubmitting(true);
    try {
      await updateHitBlowGameState(gameId, next);
      setSecretInput("");
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myRole, secretInput]);

  const handleSubmitGuess = useCallback(async () => {
    if (myRole === "spectator") return;
    if (!gameId || !state || state.phase !== "play" || state.winner) return;
    if (state.currentTurn !== myRole || !isValidGuess(guessInput)) return;
    setIsSubmitting(true);
    try {
      const next = submitGuess(state, guessInput);
      await updateHitBlowGameState(gameId, next);
      setGuessInput("");
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, state, myRole, guessInput]);

  if (loading || !gameId) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
        <h1 className="text-2xl font-bold text-stone-900 font-serif">Hit and Blow</h1>
        <p className="text-stone-600">読み込み中…</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
        <h1 className="text-2xl font-bold text-stone-900 font-serif">Hit and Blow</h1>
        <p className="text-red-600">ゲームの取得に失敗しました</p>
        <Link href="/hitblow" className="text-amber-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (gameData.status === "waiting") {
    const isHost = pid === hostId;
    const isSpectatorWaiting = myRole === "spectator";
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-200">
        <h1 className="text-2xl font-bold text-stone-900 font-serif">Hit and Blow</h1>
        {isSpectatorWaiting ? (
          <p className="text-stone-700">ゲームはまだ開始していません。Hostが相手の参加を待っています。</p>
        ) : isHost ? (
          <>
            <p className="text-stone-700">ゲームIDを相手に伝えて待機しています</p>
            <div className="rounded-xl bg-stone-100 p-6 border-4 border-amber-800 shadow-2xl shadow-inner">
              <p className="text-xs text-stone-600 mb-1">ゲームID</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-mono font-bold text-stone-900 break-all">{gameData.id}</p>
                <CopyButton text={gameData.id} />
              </div>
            </div>
          </>
        ) : (
          <p className="text-stone-600">参加処理中…</p>
        )}
        <Link href="/hitblow" className="text-amber-700 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
        <h1 className="text-2xl font-bold text-stone-900 font-serif">Hit and Blow</h1>
        <p className="text-stone-600">ゲームデータを読み込めません</p>
        <Link href="/hitblow" className="text-amber-600 underline font-medium">ロビーに戻る</Link>
      </div>
    );
  }

  const isSpectator = myRole === "spectator";
  const mergedHistory = getMergedHistory(state);
  const isMyTurn = !isSpectator && state.phase === "play" && state.currentTurn === myRole && !state.winner;
  const opponentIsSet = myRole === "player1" ? state.p2IsSet : state.p1IsSet;
  const iAmSet = myRole === "player1" ? state.p1IsSet : state.p2IsSet;

  const StatusIcon = ({ status }: { status: "online" | "offline" | null }) =>
    status === "online" ? <span title="オンライン">🟢</span> : <span title="オフライン">🔴</span>;

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 bg-stone-200">
      {showDisconnectBanner && (
        <div className="w-full py-2 px-4 rounded-lg bg-red-600 text-white font-medium text-center shadow-lg" role="alert">
          ⚠️ 相手との接続が切れました
        </div>
      )}
      {showReconnectMessage && !showDisconnectBanner && (
        <div className="w-full py-2 px-4 rounded-lg bg-emerald-600 text-white font-medium text-center shadow-lg" role="status">
          再接続しました
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {isSpectator && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-bold border-2 border-amber-800 shadow-lg">
              👀 観戦モード
            </span>
          )}
          <h1 className="text-2xl font-bold text-stone-900 font-serif">Hit and Blow</h1>
          {!isSpectator && opponentStatus !== null && (
            <span className="text-sm text-stone-700 flex items-center gap-1">
              相手 <StatusIcon status={opponentStatus} />
            </span>
          )}
          {isSpectator && (player1Status !== null || player2Status !== null) && (
            <span className="text-sm text-stone-700 flex items-center gap-2">
              Player 1 <StatusIcon status={player1Status ?? "offline"} /> / Player 2 <StatusIcon status={player2Status ?? "offline"} />
            </span>
          )}
        </div>
        <Link href="/hitblow" className="text-stone-700 text-sm underline hover:text-amber-700 font-medium">ロビーに戻る</Link>
      </div>

      {!isSpectator && state.phase === "setup" && (
        <section className="rounded-xl bg-stone-100 p-4 border-4 border-amber-800 shadow-2xl shadow-inner max-w-lg w-full">
          <h2 className="text-lg font-bold text-stone-900 font-serif mb-2 border-b-2 border-stone-800 pb-1">セットアップ</h2>
          <p className="text-stone-700 text-sm mb-3">自分の秘密の数字（4桁・重複なし）を入力してください。</p>
          <p className="text-xs text-stone-600 mb-2">相手: {opponentIsSet ? "設定完了" : "設定待ち"}</p>
          {!iAmSet ? (
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="例: 1234"
                className="px-3 py-2 rounded-lg border-4 border-amber-800 bg-white text-stone-900 font-mono text-lg w-28"
              />
              <button
                type="button"
                onClick={handleSetSecret}
                disabled={isSubmitting || !isValidGuess(secretInput)}
                className="px-4 py-2 rounded-lg bg-amber-700 text-white font-bold hover:bg-amber-600 border-2 border-stone-800 disabled:opacity-50"
              >
                {isSubmitting ? "送信中…" : "決定"}
              </button>
            </div>
          ) : (
            <p className="text-stone-600 text-sm">あなたは設定済みです。相手の設定を待っています。</p>
          )}
        </section>
      )}

      {isSpectator && state.phase === "setup" && (
        <section className="rounded-xl bg-stone-100 p-4 border-4 border-amber-800 shadow-2xl shadow-inner max-w-lg w-full">
          <p className="text-stone-700 text-sm">両者が秘密の数字を設定中です。Player 1: {state.p1IsSet ? "設定完了" : "設定待ち"} / Player 2: {state.p2IsSet ? "設定完了" : "設定待ち"}</p>
        </section>
      )}

      {!isSpectator && state.phase === "play" && !state.winner && (
        <section className="rounded-xl bg-stone-100 p-4 border-4 border-amber-800 shadow-2xl shadow-inner max-w-lg w-full">
          <p className="text-sm font-medium text-stone-800 mb-2">
            {isMyTurn ? <span className="text-amber-700 font-bold">あなたのターンです。相手の数字を予想してください。</span> : "相手のターンです。"}
          </p>
          {isMyTurn && (
            <div className="flex gap-2 items-center flex-wrap mt-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="例: 1234"
                className="px-3 py-2 rounded-lg border-4 border-amber-800 bg-white text-stone-900 font-mono text-lg w-28"
              />
              <button
                type="button"
                onClick={handleSubmitGuess}
                disabled={isSubmitting || !isValidGuess(guessInput)}
                className="px-4 py-2 rounded-lg bg-amber-700 text-white font-bold hover:bg-amber-600 border-2 border-stone-800 disabled:opacity-50"
              >
                {isSubmitting ? "送信中…" : "コール"}
              </button>
            </div>
          )}
        </section>
      )}

      {isSpectator && state.phase === "play" && !state.winner && (
        <section className="rounded-xl bg-stone-100 p-4 border-4 border-amber-800 shadow-2xl shadow-inner max-w-lg w-full">
          <p className="text-stone-700 text-sm">現在のターン: {state.currentTurn === "player1" ? "Player 1" : "Player 2"}</p>
        </section>
      )}

      {state.winner && (
        <div className="rounded-xl bg-amber-100 p-4 border-4 border-amber-800 shadow-2xl max-w-lg w-full text-center">
          <p className="text-lg font-bold text-amber-900 font-serif">
            {isSpectator
              ? (state.winner === "player1" ? "Player 1 の勝ち！" : "Player 2 の勝ち！")
              : (state.winner === myRole ? "あなたの勝ち！" : "相手の勝ち！")}
          </p>
          {!isSpectator && (
            <p className="text-stone-700 mt-1 text-sm">
              {state.winner === myRole
                ? <>相手の秘密の数字は <span className="font-mono font-bold">{myRole === "player1" ? state.p2Secret : state.p1Secret}</span> でした。</>
                : <>あなたの秘密の数字 <span className="font-mono font-bold">{myRole === "player1" ? state.p1Secret : state.p2Secret}</span> を相手に当てられました。</>
              }
            </p>
          )}
        </div>
      )}

      {isSpectator && (
        <section className="rounded-xl bg-stone-100 p-4 border-4 border-amber-800 shadow-inner max-w-lg w-full">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-800">
            <input
              type="checkbox"
              checked={showReveal}
              onChange={(e) => setShowReveal(e.target.checked)}
              className="rounded border-amber-800"
            />
            答えを見る（両者の秘密の数字を表示）
          </label>
          {(state.phase === "play" || state.winner) && (
            <p className="text-stone-600 text-xs mt-2">
              Player 1 の秘密: {showReveal ? <span className="font-mono font-bold">{state.p1Secret}</span> : "****"} / Player 2 の秘密: {showReveal ? <span className="font-mono font-bold">{state.p2Secret}</span> : "****"}
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl bg-stone-100 p-4 border-4 border-stone-800 shadow-inner max-w-lg w-full">
        <p className="text-xs text-stone-600 font-medium mb-2 border-b border-stone-600 pb-1">予想履歴{isSpectator ? "（Player 1 / Player 2）" : "（自分の手番 / 相手の手番）"}</p>
        {mergedHistory.length === 0 ? (
          <p className="text-stone-500 text-sm">まだ予想はありません</p>
        ) : (
          <ul className="space-y-2">
            {mergedHistory.map((entry, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="text-stone-500 w-20">
                  {isSpectator ? (entry.player === "player1" ? "Player 1" : "Player 2") : (entry.player === myRole ? "自分の手番" : "相手の手番")}
                </span>
                <span className="font-mono font-bold text-stone-900 w-16">{entry.guess}</span>
                <span className="text-stone-700">
                  → <span className="font-semibold text-amber-700">{entry.hit}H</span> <span className="font-semibold text-blue-700">{entry.blow}B</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="text-center text-stone-500 text-xs py-2">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}

export default function HitBlowGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 gap-4 items-center justify-center bg-stone-100">
          <h1 className="text-2xl font-bold text-stone-900 font-serif">Hit and Blow</h1>
          <p className="text-stone-600">読み込み中…</p>
        </div>
      }
    >
      <HitBlowGameContent />
    </Suspense>
  );
}
