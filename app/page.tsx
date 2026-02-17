"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col p-6 gap-8 items-center justify-center bg-gradient-to-b from-stone-100 to-orange-50/60 text-stone-900">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 drop-shadow-sm tracking-wide">
          ゲームポータル
        </h1>
        <p className="text-stone-600 text-sm md:text-base">遊びたいゲームを選んでください</p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">
        <Link
          href="/elemental"
          className="w-full px-6 py-5 rounded-xl bg-stone-100 border-4 border-amber-700/50 shadow-lg hover:bg-amber-50 hover:border-amber-600 transition-all text-left group"
        >
          <span className="text-xl font-bold text-stone-900 group-hover:text-amber-800">Elemental Paths (Card Game)</span>
          <p className="text-sm text-stone-600 mt-1">精霊の道 — 5つの属性を極めるカード対戦</p>
        </Link>

        <Link
          href="/hitblow"
          className="w-full px-6 py-5 rounded-xl bg-stone-100 border-4 border-amber-700/50 shadow-lg hover:bg-amber-50 hover:border-amber-600 transition-all text-left group"
        >
          <span className="text-xl font-bold text-stone-900 group-hover:text-amber-800">Hit and Blow (Logic Game)</span>
          <p className="text-sm text-stone-600 mt-1">数字当て推理ゲーム — 2人対戦</p>
        </Link>

        <Link
          href="/nothanks"
          className="w-full px-6 py-5 rounded-xl bg-purple-950/80 border-4 border-purple-700/50 shadow-lg hover:bg-purple-900/80 hover:border-purple-600 transition-all text-left group"
        >
          <span className="text-xl font-bold text-purple-100 group-hover:text-purple-200">Cursed Gifts (No Thanks!)</span>
          <p className="text-sm text-purple-300 mt-1">呪いの贈り物 — 3〜5人用</p>
        </Link>

        <Link
          href="/loveletter"
          className="w-full px-6 py-5 rounded-xl bg-red-950/80 border-4 border-amber-700/50 shadow-lg hover:bg-red-900/80 hover:border-amber-600 transition-all text-left group"
        >
          <span className="text-xl font-bold text-amber-100 group-hover:text-amber-50">Court Intrigue (Love Letter)</span>
          <p className="text-sm text-amber-200/90 mt-1">王宮の陰謀 — 2〜4人用</p>
        </Link>

        <Link
          href="/valuetalk"
          className="w-full px-6 py-5 rounded-xl bg-orange-100 border-4 border-orange-300 shadow-lg hover:bg-orange-50 hover:border-orange-400 transition-all text-left group"
        >
          <span className="text-xl font-bold text-orange-900 group-hover:text-orange-800">Value Talk (協力)</span>
          <p className="text-sm text-orange-600 mt-1">数字をたとえ話で伝える ito風ゲーム</p>
        </Link>

        <Link
          href="/midnight"
          className="w-full px-6 py-5 rounded-xl bg-purple-950/80 border-4 border-fuchsia-600/50 shadow-lg hover:bg-purple-900/80 hover:border-fuchsia-500 transition-all text-left group"
        >
          <span className="text-xl font-bold text-fuchsia-200 group-hover:text-fuchsia-100">Midnight Party (対戦)</span>
          <p className="text-sm text-purple-300 mt-1">合計値を推理してビッド — コヨーテ風 2〜10人</p>
        </Link>

        <Link
          href="/abyss"
          className="w-full px-6 py-5 rounded-xl bg-slate-900/90 border-4 border-cyan-600/50 shadow-lg hover:bg-slate-800 hover:border-cyan-500 transition-all text-left group"
        >
          <span className="text-xl font-bold text-cyan-200 group-hover:text-cyan-100">Abyss Salvage (ボード)</span>
          <p className="text-sm text-cyan-300/90 mt-1">深海探検 — 遺跡を拾い酸素を共有して帰還 2〜6人</p>
        </Link>

        <Link
          href="/secretword"
          className="w-full px-6 py-5 rounded-xl bg-emerald-950/90 border-4 border-emerald-600/50 shadow-lg hover:bg-emerald-900/80 hover:border-emerald-500 transition-all text-left group"
        >
          <span className="text-xl font-bold text-emerald-200 group-hover:text-emerald-100">Secret Word (会話)</span>
          <p className="text-sm text-emerald-300/90 mt-1">ワードウルフ風 — お題を推理してウルフを当てる 3〜8人</p>
        </Link>
      </div>

      <footer className="mt-8 text-center text-stone-500 text-xs max-w-md px-4">
        ※ これは非公式のファンプロジェクトであり、オリジナルのゲームとは関係ありません。
      </footer>
    </div>
  );
}
