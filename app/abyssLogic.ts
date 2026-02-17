/**
 * Abyss Salvage（深海探検風）ボードゲームロジック
 * 潜水艦から潜り、遺跡を拾い、酸素を共有しながら帰還する。
 */

export type PathCellType = "ruin" | "blank";

export interface PathCell {
  level: number;
  score: number;
  type: PathCellType;
  stack_count: number;
}

export interface AbyssRuin {
  level: number;
  score: number;
}

export interface AbyssPlayerState {
  position: number;
  direction: "descending" | "returning";
  ruins: AbyssRuin[];
  totalScore: number;
}

export type AbyssPhase = "playing" | "round_result" | "gameover";

export interface AbyssGameState {
  phase: AbyssPhase;
  oxygen: number;
  round: number;
  path: PathCell[];
  players: AbyssPlayerState[];
  currentPlayerIndex: number;
  /** このターンに酸素消費済みか */
  oxygenConsumedThisTurn?: boolean;
  /** このターンに移動済みか（1ターン1回まで） */
  movedThisTurn?: boolean;
  /** 酸素0でラウンド終了したか（全員没収） */
  roundForfeited?: boolean;
  /** UI: 直近のサイコロ [d1, d2] */
  lastDice?: [number, number];
}

export const OXYGEN_MAX = 25;
export const TOTAL_ROUNDS = 3;
const PATH_LENGTH = 32;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

/** レベルごとの得点範囲 */
function scoreForLevel(level: number): number {
  const ranges: Record<number, [number, number]> = {
    1: [1, 3],
    2: [2, 5],
    3: [3, 7],
    4: [5, 10],
  };
  const [min, max] = ranges[level] ?? [1, 3];
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** 初期パス生成（レベル1〜4の遺跡をランダムに配置、先頭は空き＝潜水艦） */
export function createInitialPath(): PathCell[] {
  const path: PathCell[] = [];
  path.push({ level: 0, score: 0, type: "blank", stack_count: 0 }); // 潜水艦マス
  const ruinsNeeded = PATH_LENGTH - 1;
  const levels: number[] = [];
  for (let i = 0; i < ruinsNeeded; i++) {
    levels.push((i % 4) + 1); // 1,2,3,4 を繰り返し、後ろほど高レベル多めにしたいなら調整可
  }
  for (let i = ruinsNeeded - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [levels[i], levels[j]] = [levels[j], levels[i]];
  }
  for (const level of levels) {
    path.push({
      level,
      score: scoreForLevel(level),
      type: "ruin",
      stack_count: 1,
    });
  }
  return path;
}

function createBlankCell(): PathCell {
  return { level: 0, score: 0, type: "blank", stack_count: 0 };
}

export function createInitialAbyssState(playerCount: number): AbyssGameState {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`2〜6人で遊べます（現在: ${playerCount}人）`);
  }
  const players: AbyssPlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      position: 0,
      direction: "descending",
      ruins: [],
      totalScore: 0,
    });
  }
  return {
    phase: "playing",
    oxygen: OXYGEN_MAX,
    round: 1,
    path: createInitialPath(),
    players,
    currentPlayerIndex: 0,
  };
}

/**
 * ターン開始時の酸素消費。消費後に 0 以下なら true（ラウンド強制終了）。
 * 1ターンに1回だけ有効（oxygenConsumedThisTurn でガード）。
 */
export function consumeOxygen(state: AbyssGameState): { next: AbyssGameState; oxygenDepleted: boolean } | null {
  if (state.phase !== "playing") return null;
  if (state.oxygenConsumedThisTurn) return null;
  const player = state.players[state.currentPlayerIndex];
  const consumption = player.ruins.length;
  const newOxygen = Math.max(0, state.oxygen - consumption);
  const next: AbyssGameState = {
    ...state,
    oxygen: newOxygen,
    oxygenConsumedThisTurn: true,
  };
  return { next, oxygenDepleted: newOxygen <= 0 };
}

/**
 * 方向を「戻る」に切り替え（下り中のみ可能）
 */
export function switchToReturning(state: AbyssGameState, playerIndex: number): AbyssGameState | null {
  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (!state.oxygenConsumedThisTurn) return null;
  const player = state.players[playerIndex];
  if (player.direction !== "descending") return null;
  const players = [...state.players];
  players[playerIndex] = { ...player, direction: "returning" };
  return { ...state, players };
}

/**
 * サイコロ2つ（各1〜3）を振る
 */
export function rollDice(): [number, number] {
  const d1 = 1 + Math.floor(Math.random() * 3);
  const d2 = 1 + Math.floor(Math.random() * 3);
  return [d1, d2];
}

/**
 * 移動: 出目 - 持っている遺跡数（最低0）だけ進む。
 * 他のプレイヤーがいるマスは数えず飛び越える（while でスキップ）。
 */
export function movePlayer(
  state: AbyssGameState,
  playerIndex: number,
  diceTotal: number,
  lastDice: [number, number]
): AbyssGameState | null {
  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (!state.oxygenConsumedThisTurn || state.movedThisTurn) return null;
  const player = state.players[playerIndex];
  const effectiveSteps = Math.max(0, diceTotal - player.ruins.length);
  const dir = player.direction === "descending" ? 1 : -1;
  const pathLen = state.path.length;

  let pos = player.position;
  let stepsLeft = effectiveSteps;

  while (stepsLeft > 0) {
    const nextPos = pos + dir;
    if (nextPos < 0 || nextPos >= pathLen) break;
    const otherPlayerAtNext = state.players.some(
      (p, i) => i !== playerIndex && p.position === nextPos
    );
    pos = nextPos;
    if (!otherPlayerAtNext) stepsLeft--;
  }

  const players = [...state.players];
  players[playerIndex] = { ...player, position: pos };
  return {
    ...state,
    players,
    lastDice,
    movedThisTurn: true,
  };
}

/**
 * 遺跡を拾う（止まったマスが ruin のとき）
 */
export function pickUpRuin(state: AbyssGameState, playerIndex: number): AbyssGameState | null {
  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  const player = state.players[playerIndex];
  const cell = state.path[player.position];
  if (!cell || cell.type !== "ruin") return null;
  const ruin: AbyssRuin = { level: cell.level, score: cell.score };
  const path = [...state.path];
  path[player.position] = createBlankCell();
  const players = [...state.players];
  players[playerIndex] = {
    ...player,
    ruins: [...player.ruins, ruin],
  };
  return { ...state, path, players };
}

/**
 * 遺跡を置く（止まったマスが blank で、持っているとき）
 */
export function dropRuin(state: AbyssGameState, playerIndex: number): AbyssGameState | null {
  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  const player = state.players[playerIndex];
  const cell = state.path[player.position];
  if (!cell || cell.type !== "blank" || player.ruins.length === 0) return null;
  const ruin = player.ruins[player.ruins.length - 1];
  const path = [...state.path];
  path[player.position] = {
    level: ruin.level,
    score: ruin.score,
    type: "ruin",
    stack_count: 1,
  };
  const players = [...state.players];
  players[playerIndex] = {
    ...player,
    ruins: player.ruins.slice(0, -1),
  };
  return { ...state, path, players };
}

/** 全員が潜水艦（position 0）にいるか */
function allReturned(state: AbyssGameState): boolean {
  return state.players.every((p) => p.position === 0);
}

/**
 * ラウンド終了処理（酸素0 or 全員帰還）
 * oxygenDepleted: true のときは獲得物没収（得点加算なし）
 */
export function finishRound(
  state: AbyssGameState,
  oxygenDepleted: boolean
): AbyssGameState {
  const updatedScores = state.players.map((p) => {
    if (oxygenDepleted) return p.totalScore;
    if (p.position === 0) {
      return p.totalScore + p.ruins.reduce((s, r) => s + r.score, 0);
    }
    return p.totalScore;
  });

  let path = state.path.filter((c) => c.type === "ruin").map((c) => ({ ...c }));
  if (!oxygenDepleted) {
    for (const p of state.players) {
      if (p.position !== 0) {
        for (const r of p.ruins) {
          path.push({
            level: r.level,
            score: r.score,
            type: "ruin" as const,
            stack_count: 1,
          });
        }
      }
    }
  }
  path.unshift(createBlankCell());

  const isGameOver = state.round >= TOTAL_ROUNDS;
  const nextRound = Math.min(state.round + 1, TOTAL_ROUNDS);

  const next: AbyssGameState = {
    phase: isGameOver ? "gameover" : "round_result",
    oxygen: OXYGEN_MAX,
    round: nextRound,
    path,
    players: updatedScores.map((totalScore) => ({
      position: 0,
      direction: "descending" as const,
      ruins: [],
      totalScore,
    })),
    currentPlayerIndex: 0,
    roundForfeited: oxygenDepleted,
  };
  return next;
}

/**
 * ターン終了：次のプレイヤーへ。酸素消費フラグはリセット。
 */
export function endTurn(state: AbyssGameState): AbyssGameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    oxygenConsumedThisTurn: false,
    movedThisTurn: false,
  };
}

/**
 * 酸素消費を1回実行。0以下ならラウンド終了（没収）。それ以外は消費だけ。
 */
export function applyOxygenAndMaybeFinishRound(
  state: AbyssGameState
): AbyssGameState | null {
  const result = consumeOxygen(state);
  if (!result) return null;
  const { next, oxygenDepleted } = result;
  if (oxygenDepleted) return finishRound(next, true);
  return next;
}

/**
 * 全員帰還でラウンド終了
 */
export function checkAllReturnedAndFinishRound(state: AbyssGameState): AbyssGameState | null {
  if (state.phase !== "playing") return null;
  if (!allReturned(state)) return null;
  return finishRound(state, false);
}

/**
 * ターン終了し、全員帰還していればラウンド終了を適用
 */
export function endTurnAndMaybeFinishRound(state: AbyssGameState): AbyssGameState {
  const next = endTurn(state);
  const allBack = next.players.every((p) => p.position === 0);
  if (allBack) return finishRound(next, false);
  return next;
}
