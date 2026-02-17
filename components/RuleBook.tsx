"use client";

import { useState, useCallback } from "react";

export type RuleBookGameType = "loveletter" | "valuetalk" | "midnight" | "abyss";

const RULE_CONTENT: Record<
  RuleBookGameType,
  { title: string; subtitle?: string; sections: { heading: string; body: React.ReactNode }[] }
> = {
  loveletter: {
    title: "Court Intrigue (Love Letter)",
    subtitle: "王宮の陰謀",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            手札の強さを競うか、最後まで生き残る。ラウンド終了時に最も強いカードを持っているプレイヤー、または最後の1人になったプレイヤーがラウンドに勝利します。
          </p>
        ),
      },
      {
        heading: "カード効果",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>8 姫 (Princess):</strong> 捨てると即脱落。</li>
            <li><strong>7 大臣 (Countess):</strong> 王(6)か王子(5)を持っていたら必ず捨てる。</li>
            <li><strong>6 王 (King):</strong> 相手と手札を交換。</li>
            <li><strong>5 王子 (Prince):</strong> 誰かの手札を捨てさせ、引き直させる。</li>
            <li><strong>4 僧侶 (Handmaid):</strong> 次の手番まで無敵。</li>
            <li><strong>3 男爵 (Baron):</strong> 相手と数字を比較。小さい方が脱落。</li>
            <li><strong>2 神父 (Priest):</strong> 相手の手札を見る。</li>
            <li><strong>1 兵士 (Guard):</strong> 相手の手札（2〜8）を当てる。当たれば脱落させる。</li>
          </ul>
        ),
      },
    ],
  },
  valuetalk: {
    title: "Value Talk",
    subtitle: "数字をたとえ話で伝える協力ゲーム",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            全員で協力して、数字の小さい順にカードを出す。お題に沿った「たとえ話」だけで数字を伝え合い、場にカードを出していきます。
          </p>
        ),
      },
      {
        heading: "基本ルール",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>数字そのものを喋ってはいけない。</strong></li>
            <li>お題（例：「強い動物」）に沿った言葉で数字を表現する。</li>
            <li>「フキダシ」に入力してアピールしよう。</li>
          </ul>
        ),
      },
      {
        heading: "失敗条件",
        body: <p>場のカードより小さい数字を持っている人がいたらライフ減少。</p>,
      },
      {
        heading: "勝利条件",
        body: <p>全員の手札がなくなればクリア。</p>,
      },
    ],
  },
  midnight: {
    title: "Midnight Party",
    subtitle: "コヨーテ風・合計値を推理してビッド",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            全員のカード合計値を超えないように数字を宣言する。他人のカードを見て推理し、前の人より大きい数字を宣言するか、「Midnight!」でチャレンジする。
          </p>
        ),
      },
      {
        heading: "基本ルール",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>自分のカードだけ見えない。</strong> 他人のカードを見て推理する。</li>
            <li>前の人より大きい数字を宣言する。</li>
            <li>無理だと思ったら「Midnight!（チャレンジ）」を宣言。</li>
          </ul>
        ),
      },
      {
        heading: "特殊カード",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>x2 (Double):</strong> 合計値を2倍にする。</li>
            <li><strong>MAX=0 (Night):</strong> 場にある最大の数字カードを0にする。</li>
            <li><strong>? (Mystery):</strong> 山札から1枚引いて加算する。</li>
            <li><strong>-5 / -10:</strong> 合計値から引く。</li>
          </ul>
        ),
      },
    ],
  },
  abyss: {
    title: "Abyss Salvage",
    subtitle: "深海探検・酸素を共有して帰還",
    sections: [
      {
        heading: "目的",
        body: (
          <p>
            酸素がなくなる前に、お宝を持って潜水艦に帰る。深く潜って遺跡（チップ）を拾い、共有の酸素を意識しながら戻ってこよう。
          </p>
        ),
      },
      {
        heading: "酸素ルール（重要）",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li><strong>酸素は全員で共有。</strong></li>
            <li>ターン開始時、<strong>「持っているお宝の数」だけ酸素が減る。</strong></li>
            <li>酸素が0になったら、戻れていない人は全員溺れてお宝没収。</li>
          </ul>
        ),
      },
      {
        heading: "移動ルール",
        body: (
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>サイコロの出目から「お宝の数」を引いた分だけ進める。</li>
            <li><strong>他人がいるマスは飛び越える（カウントしない）。</strong></li>
          </ul>
        ),
      },
      {
        heading: "帰り道",
        body: <p>一度「戻る」を選択すると、もう潜れない。往路でお宝を拾い、復路で潜水艦まで戻ろう。</p>,
      },
    ],
  },
};

export function RuleBook({ gameType }: { gameType: RuleBookGameType }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const content = RULE_CONTENT[gameType];

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-white/95 border-2 border-stone-300 shadow-md flex items-center justify-center text-stone-600 hover:bg-stone-50 hover:border-stone-400 text-lg font-bold"
        aria-label="ルールを開く"
      >
        ?
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={toggle}
            aria-hidden
          />
          <div
            className="fixed inset-4 sm:inset-8 md:inset-10 z-50 flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto max-h-[85vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rulebook-title"
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
              <h2 id="rulebook-title" className="text-lg font-bold text-stone-800">
                {content.title}
                {content.subtitle && (
                  <span className="block text-sm font-normal text-stone-500 mt-0.5">
                    {content.subtitle}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={toggle}
                className="w-9 h-9 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100 flex items-center justify-center text-lg font-bold"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-stone-800">
              <div className="space-y-6">
                {content.sections.map((section, i) => (
                  <section key={i}>
                    <h3 className="text-base font-bold text-stone-900 mb-2 border-b border-stone-200 pb-1">
                      {section.heading}
                    </h3>
                    <div className="text-sm sm:text-base leading-relaxed">
                      {section.body}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
