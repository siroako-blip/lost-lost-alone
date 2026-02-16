"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-slate-900 text-slate-100">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wider">
          Elemental Paths
        </h1>
        <p className="text-slate-400 text-sm md:text-base">精霊の道 — 5つの属性を極める旅</p>
      </div>

      <div className="w-full max-w-sm rounded-xl bg-slate-800/95 p-6 border-2 border-slate-600 flex flex-col gap-6 shadow-2xl relative z-10">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white font-bold text-lg hover:from-indigo-500 hover:to-slate-700 border-2 border-slate-600 shadow-lg disabled:opacity-50 transition-all active:scale-95"
        >
          {loading === "create" ? "道を開いています…" : "精霊の道を開く (Host)"}
        </button>

        <div className="border-t-2 border-slate-600 pt-5">
          <p className="text-sm text-slate-300 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full" />
            旅に参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-500 bg-slate-700 text-slate-100 focus:border-indigo-500 focus:outline-none placeholder-slate-400"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-slate-600 text-slate-100 font-bold hover:bg-slate-500 border border-slate-500 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-3 text-sm rounded" role="alert">
            <p>{error}</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowRules(true)}
        className="text-slate-400 hover:text-indigo-300 underline underline-offset-4 text-sm transition-colors flex items-center gap-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        ゲームのルールを確認する
      </button>

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-800 text-slate-100 rounded-2xl border-2 border-slate-600 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-4 border-b border-slate-600 flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-bold text-indigo-300">精霊の道 — ルール</h2>
              <button onClick={() => setShowRules(false)} className="p-1 hover:bg-slate-700 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm md:text-base leading-relaxed">
              <section>
                <h3 className="text-indigo-200 font-bold mb-2 text-lg border-b border-slate-600 pb-1">目的</h3>
                <p className="text-slate-300">
                  5つの属性（<span className="text-red-400">火</span>・<span className="text-blue-400">水</span>・<span className="text-emerald-400">風</span>・<span className="text-amber-400">土</span>・<span className="text-slate-200">光</span>）の「道」にカードを並べ、スコアを競います。<br />
                  各道には<span className="text-red-400 font-bold">コスト（-20点）</span>がかかります。途中で止めると赤字になります。
                </p>
              </section>

              <section>
                <h3 className="text-indigo-200 font-bold mb-2 text-lg border-b border-slate-600 pb-1">カードの種類と出し方</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-300">
                  <li>
                    <span className="font-bold text-white">数字カード (2〜10):</span><br />
                    自分の道に出すときは、<span className="text-indigo-300 font-bold">小さい数字から大きい数字の順（昇順）</span>にしか出せません。
                  </li>
                  <li>
                    <span className="font-bold text-white">契約カード (🤝):</span><br />
                    得点を倍にするカードです。<span className="text-indigo-300 font-bold">数字カードを出す前</span>にのみ出せます。1枚で2倍、2枚で3倍、3枚で4倍。
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-indigo-200 font-bold mb-2 text-lg border-b border-slate-600 pb-1">ターンの流れ</h3>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  <li><span className="font-bold text-white">カードを1枚出す:</span> 自分の道に置くか、捨て札置き場に捨てる。</li>
                  <li><span className="font-bold text-white">カードを1枚引く:</span> 山札か、自分が捨てた属性以外の捨て札から引く。</li>
                </ol>
              </section>

              <section>
                <h3 className="text-indigo-200 font-bold mb-2 text-lg border-b border-slate-600 pb-1">得点計算</h3>
                <div className="bg-slate-900/50 p-3 rounded border border-slate-600 font-mono text-sm">
                  (数字の合計 - 20) × (契約の枚数 + 1)
                </div>
                <p className="text-slate-300 mt-2 text-xs">
                  道に8枚以上あるとボーナス <span className="text-emerald-400">+20点</span>。1枚も置いていない道は 0点です。
                </p>
              </section>
            </div>

            <div className="bg-slate-900 p-4 border-t border-slate-600 text-center">
              <button
                onClick={() => setShowRules(false)}
                className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors shadow-lg"
              >
                理解した！
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-slate-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
