export type CardColor = "red" | "green" | "blue" | "white" | "yellow";

export type CardValue = number | "wager"; // 2-10 or wager (handshake)

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export type PlayerId = "player1" | "player2";

// 各色の expedition: 先に wager のみ、その後は数字の昇順
export type ExpeditionColumn = Card[];

export interface GameState {
  deck: Card[];
  player1Hand: Card[];
  player2Hand: Card[];
  player1Expeditions: Record<CardColor, ExpeditionColumn>;
  player2Expeditions: Record<CardColor, ExpeditionColumn>;
  discardPiles: Record<CardColor, Card[]>;
  currentPlayer: PlayerId;
  selectedCard: Card | null;
  phase: "play" | "draw"; // 出札後は draw フェーズで1枚引く
  lastDiscardedColor: CardColor | null; // 直前に捨てた色（この色の捨て札からは引けない）
}

export const COLORS: CardColor[] = ["red", "green", "blue", "white", "yellow"];

export const COLOR_LABELS: Record<CardColor, string> = {
  red: "赤",
  green: "緑",
  blue: "青",
  white: "白",
  yellow: "黄",
};

/** 1色分の得点内訳（結果画面用） */
export interface ColorScoreDetail {
  base: number;       // 数字の合計 - 20（カード0枚の色は計算しない→0）
  wagerCount: number; // 握手カード枚数
  multiplier: number; // 倍率（握手0→1, 1→2, 2→3, 3→4）
  bonus: number;      // 8枚以上で+20、それ以外0
  total: number;      // (基本点×倍率) + ボーナス
}

/** 1プレイヤー分の得点（色ごと＋合計） */
export interface PlayerScore {
  perColor: Record<CardColor, ColorScoreDetail>;
  total: number;
}
