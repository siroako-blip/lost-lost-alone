"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
// createClient は gameDb 内で処理するので不要
import { createGame, getGame, joinGame, startGame } from "@/lib/gameDb";
import { createInitialState } from "@/app/gameLogic";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

export default function LobbyPage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // ★追加: ルール画面の表示スイッチ
  const [showRules, setShowRules] = useState(false);

  const handleCreate = async () => {
    setError(null);
    setLoading("create");
    try {
      const player1Id = generatePlayerId();
      const { id } = await createGame(player1Id);
      router.push(`/game/${id}?pid=${encodeURIComponent(player1Id)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "ゲームの作成に失敗しました");
      setLoading(null);
    }
  };

  const handleJoin = async () => {
    const trimmed = joinId.trim();
    if (!trimmed) {
      setError("ゲームIDを入力してください");
      return;
    }
    setError(null);
    setLoading("join");
    try {
      const player2Id = generatePlayerId();
      const existing = await getGame(trimmed);
      if (!existing) {
        setError("ゲームが見つかりません");
        setLoading(null);
        return;
      }
      if (existing.player2_id) {
        setError("このゲームは既に満員です");
        setLoading(null);
        return;
      }
      await joinGame(trimmed, player2Id);
      const row = await getGame(trimmed);
      if (row && !row.game_state) {
        const initialState = createInitialState();
        await startGame(trimmed, initialState);
      }
      router.push(`/game/${trimmed}?pid=${encodeURIComponent(player2Id)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-stone-900 text-amber-50">
      
      {/* タイトルエリア */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-amber-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wider">
          Lost Cities
        </h1>
        <p className="text-stone-400 text-sm md:text-base">古代遺跡への探検に出かけよう</p>
      </div>

      {/* メイン操作パネル */}
      <div className="w-full max-w-sm rounded-xl bg-amber-50/95 p-6 border-2 border-amber-800 flex flex-col gap-6 shadow-2xl relative z-10">
        
        {/* 作成ボタン */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-white font-bold text-lg hover:from-amber-600 hover:to-amber-800 border-2 border-amber-950 shadow-lg disabled:opacity-50 transition-all active:scale-95"
        >
          {loading === "create" ? "遺跡を準備中…" : "新しい探検を始める (Host)"}
        </button>

        {/* 参加エリア */}
        <div className="border-t-2 border-stone-300 pt-5">
          <p className="text-sm text-stone-700 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-stone-500 rounded-full"></span>
            探検隊に参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-stone-400 bg-stone-100 text-stone-900 focus:border-amber-600 focus:outline-none placeholder-stone-400"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-stone-700 text-amber-50 font-bold hover:bg-stone-600 border border-stone-900 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm rounded" role="alert">
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* ルールを見るボタン */}
      <button
        onClick={() => setShowRules(true)}
        className="text-stone-400 hover:text-amber-200 underline underline-offset-4 text-sm transition-colors flex items-center gap-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        ゲームのルールを確認する
      </button>

      {/* ★追加: ルール説明モーダル */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-stone-800 text-amber-50 rounded-2xl border-2 border-amber-700 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* モーダルヘッダー */}
            <div className="bg-stone-900 p-4 border-b border-stone-700 flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-bold text-amber-400">探検のルール</h2>
              <button onClick={() => setShowRules(false)} className="p-1 hover:bg-stone-700 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* モーダル本文 (スクロール可能) */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm md:text-base leading-relaxed">
              
              <section>
                <h3 className="text-amber-200 font-bold mb-2 text-lg border-b border-stone-600 pb-1">🎯 ゲームの目的</h3>
                <p className="text-stone-300">
                  5つの色（赤・緑・青・白・黄）の探検ルートにカードを並べて、できるだけ高いスコアを目指します。<br/>
                  ただし、探検には<span className="text-red-400 font-bold">コスト（-20点）</span>がかかります！中途半端な探検は赤字になります。
                </p>
              </section>

              <section>
                <h3 className="text-amber-200 font-bold mb-2 text-lg border-b border-stone-600 pb-1">🃏 カードの種類と出し方</h3>
                <ul className="list-disc pl-5 space-y-2 text-stone-300">
                  <li>
                    <span className="font-bold text-white">数字カード (2〜10):</span><br/>
                    自分の場に出すときは、<span className="text-amber-400 font-bold">小さい数字から大きい数字の順（昇順）</span>にしか出せません。<br/>
                    (例: 3を出した後に5は出せるが、2は出せない)
                  </li>
                  <li>
                    <span className="font-bold text-white">握手カード (🤝):</span><br/>
                    点数を倍にする「賭け」カードです。<br/>
                    <span className="text-amber-400 font-bold">数字カードを出す前</span>にしか出せません。1枚で2倍、2枚で3倍、3枚で4倍になります。
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-amber-200 font-bold mb-2 text-lg border-b border-stone-600 pb-1">🔄 ターンの流れ</h3>
                <ol className="list-decimal pl-5 space-y-2 text-stone-300">
                  <li>
                    <span className="font-bold text-white">カードを1枚出す:</span><br/>
                    自分の探検列に「置く」か、中央の捨て札置き場に「捨てる」かを選びます。
                  </li>
                  <li>
                    <span className="font-bold text-white">カードを1枚引く:</span><br/>
                    「山札」から引くか、自分が出した色以外の「捨て札」から引くかを選びます。
                  </li>
                </ol>
              </section>

              <section>
                <h3 className="text-amber-200 font-bold mb-2 text-lg border-b border-stone-600 pb-1">💯 得点計算</h3>
                <div className="bg-stone-900/50 p-3 rounded border border-stone-700 font-mono text-sm">
                  (数字の合計 - 20) × (握手の枚数 + 1)
                </div>
                <p className="text-stone-300 mt-2 text-xs">
                  ※ カードが8枚以上ある列は、さらにボーナス <span className="text-green-400">+20点</span> が加算されます。<br/>
                  ※ カードを1枚も置いていない列は 0点 です（-20点はされません）。
                </p>
              </section>

            </div>

            {/* モーダルフッター */}
            <div className="bg-stone-900 p-4 border-t border-stone-700 text-center">
              <button 
                onClick={() => setShowRules(false)}
                className="px-8 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-bold transition-colors shadow-lg"
              >
                理解した！
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}