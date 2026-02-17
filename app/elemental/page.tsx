"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createGame, getGame, joinGame, startGame } from "@/lib/gameDb";
import { createInitialState } from "@/app/gameLogic";

function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "pid-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

export default function ElementalLobbyPage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullGameId, setFullGameId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const handleCreate = async () => {
    setError(null);
    setLoading("create");
    try {
      const player1Id = generatePlayerId();
      const { id } = await createGame(player1Id);
      router.push(`/elemental/game/${id}?pid=${encodeURIComponent(player1Id)}`);
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
      setFullGameId(null);
      return;
    }
    setError(null);
    setFullGameId(null);
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
        setError("このゲームは既に満員です。観戦する場合は下のボタンからどうぞ。");
        setFullGameId(trimmed);
        setLoading(null);
        return;
      }
      await joinGame(trimmed, player2Id);
      const row = await getGame(trimmed);
      if (row && !row.game_state) {
        const initialState = createInitialState();
        await startGame(trimmed, initialState);
      }
      router.push(`/elemental/game/${trimmed}?pid=${encodeURIComponent(player2Id)}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 gap-6 items-center justify-center bg-gradient-to-b from-stone-100 to-orange-50/60 text-stone-900">
      <Link href="/" className="absolute top-4 left-4 text-stone-600 hover:text-amber-600 text-sm font-medium underline">
        ゲーム選択に戻る
      </Link>
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 drop-shadow-sm tracking-wider">
          Elemental Paths
        </h1>
        <p className="text-stone-600 text-sm md:text-base">精霊の道 — 5つの属性を極める旅</p>
      </div>

      <div className="w-full max-w-sm rounded-xl bg-stone-100 p-6 border-4 border-amber-700/50 flex flex-col gap-6 shadow-2xl relative z-10">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!loading}
          className="w-full px-6 py-4 rounded-xl bg-amber-600 text-white font-bold text-lg hover:bg-amber-500 border-2 border-amber-700 shadow-lg disabled:opacity-50 transition-all active:scale-95"
        >
          {loading === "create" ? "道を開いています…" : "精霊の道を開く (Host)"}
        </button>

        <div className="border-t-2 border-amber-700/40 pt-5">
          <p className="text-sm text-stone-700 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            旅に参加する (Join)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="招待IDを入力"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-amber-700/50 bg-stone-50 text-stone-900 focus:border-amber-600 focus:outline-none placeholder-stone-400"
              disabled={!!loading}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 border-2 border-amber-700 disabled:opacity-50 transition-colors"
            >
              {loading === "join" ? "…" : "参加"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-3 text-sm rounded space-y-2" role="alert">
            <p>{error}</p>
            {fullGameId && (
              <Link
                href={`/elemental/game/${fullGameId}`}
                className="inline-block px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 border-2 border-amber-700 text-sm"
              >
                観戦する
              </Link>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowRules(true)}
        className="text-stone-600 hover:text-amber-600 underline underline-offset-4 text-sm transition-colors flex items-center gap-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        ゲームのルールを確認する
      </button>

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

      <footer className="mt-8 text-center text-stone-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
