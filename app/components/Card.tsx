"use client";

import type { Card as CardType, CardColor } from "../types";
import { COLOR_LABELS } from "../types";

/* 古代神殿テーマ：太めの枠・ゴールド風の縁取り */
const COLOR_CLASSES: Record<CardColor, string> = {
  red: "bg-red-500 border-4 border-amber-900/70 text-white shadow-lg",
  green: "bg-emerald-600 border-4 border-amber-900/70 text-white shadow-lg",
  blue: "bg-blue-600 border-4 border-amber-900/70 text-white shadow-lg",
  white: "bg-stone-100 border-4 border-amber-900/70 text-stone-900 shadow-lg",
  yellow: "bg-amber-400 border-4 border-amber-900/70 text-stone-900 shadow-lg",
};

interface CardProps {
  card: CardType;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function Card({ card, faceDown, selected, onClick, compact }: CardProps) {
  const colorClass = COLOR_CLASSES[card.color];

  if (faceDown) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          rounded-md border-4 border-amber-900/60 bg-stone-400
          shadow-lg transition-all duration-200
          ${compact ? "h-12 w-9 min-w-[2.25rem]" : "h-20 w-14 min-w-[3.5rem]"}
          ${selected ? "scale-105 ring-2 ring-amber-500 ring-offset-2 ring-offset-stone-200" : ""}
          hover:border-amber-800/80 hover:shadow-xl
        `}
        aria-label="裏のカード"
      >
        <span className="text-stone-600 text-xs">?</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-md border-4 ${colorClass}
        font-bold transition-all duration-200
        shadow-lg hover:shadow-xl
        ${compact ? "h-12 w-9 min-w-[2.25rem] text-base" : "h-20 w-14 min-w-[3.5rem] text-xl"}
        ${selected ? "translate-y-[-4px] shadow-xl ring-2 ring-amber-500 ring-offset-2 ring-offset-stone-200 scale-105" : ""}
        hover:translate-y-[-2px] active:translate-y-0
      `}
      aria-label={`${COLOR_LABELS[card.color]} ${card.value === "wager" ? "契約" : card.value}`}
    >
      {card.value === "wager" ? (
        <span className="inline-flex items-center justify-center text-xl" aria-hidden>
          🤝
        </span>
      ) : (
        <span>{card.value}</span>
      )}
    </button>
  );
}
