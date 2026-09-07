import { WIN_PULLS } from "@/lib/constants";
import { makeQuestion, type GradeBand, type Question } from "@/lib/math";

export type Side = "blue" | "red";

export type SideState = {
  question: Question;
  input: string;
  score: number;
  shaking: boolean;
};

export type GameState = {
  band: GradeBand;
  blue: SideState;
  red: SideState;
  position: number;
  pullKey: number;
  lastPuller: Side | null;
  winner: Side | null;
};

export type GameAction =
  | { type: "digit"; side: Side; digit: string }
  | { type: "backspace"; side: Side }
  | { type: "toggleSign"; side: Side }
  | { type: "submit"; side: Side }
  | { type: "clearShake"; side: Side }
  | { type: "grade"; band: GradeBand }
  | { type: "playAgain" }
  | { type: "resetAll" };

const freshSide = (band: GradeBand, score = 0): SideState => ({
  question: makeQuestion(band),
  input: "",
  score,
  shaking: false,
});

export const createInitialState = (band: GradeBand = "4-5"): GameState => ({
  band,
  blue: freshSide(band),
  red: freshSide(band),
  position: 0,
  pullKey: 0,
  lastPuller: null,
  winner: null,
});

const getSide = (state: GameState, side: Side) => (side === "blue" ? state.blue : state.red);

const withSide = (state: GameState, side: Side, next: SideState): GameState =>
  side === "blue" ? { ...state, blue: next } : { ...state, red: next };

/** Grade chips only change an idle rope (center, no winner). */
export const canChangeGrade = (state: GameState) => state.position === 0 && state.winner === null;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "digit": {
      if (state.winner) return state;
      const s = getSide(state, action.side);
      if (s.shaking || s.input.length >= 5) return state;
      return withSide(state, action.side, {
        ...s,
        input: s.input + action.digit,
      });
    }
    case "backspace": {
      if (state.winner) return state;
      const s = getSide(state, action.side);
      if (s.shaking || s.input.length === 0) return state;
      return withSide(state, action.side, {
        ...s,
        input: s.input.slice(0, -1),
      });
    }
    case "toggleSign": {
      if (state.winner) return state;
      const s = getSide(state, action.side);
      if (s.shaking) return state;
      return withSide(state, action.side, {
        ...s,
        input: s.input.startsWith("-") ? s.input.slice(1) : `-${s.input}`,
      });
    }
    case "submit": {
      if (state.winner) return state;
      const s = getSide(state, action.side);
      if (s.shaking) return state;
      const value = parseInt(s.input, 10);
      if (s.input === "" || Number.isNaN(value)) return state;

      if (value !== s.question.answer) {
        return withSide(state, action.side, {
          ...s,
          input: "",
          shaking: true,
        });
      }

      const nextPos = action.side === "blue" ? state.position - 1 : state.position + 1;
      const won = Math.abs(nextPos) >= WIN_PULLS;

      return {
        ...state,
        position: nextPos,
        pullKey: state.pullKey + 1,
        lastPuller: action.side,
        winner: won ? action.side : null,
        ...(action.side === "blue"
          ? {
              blue: {
                ...s,
                input: "",
                question: makeQuestion(state.band),
                score: won ? s.score + 1 : s.score,
              },
            }
          : {
              red: {
                ...s,
                input: "",
                question: makeQuestion(state.band),
                score: won ? s.score + 1 : s.score,
              },
            }),
      };
    }
    case "clearShake": {
      const s = getSide(state, action.side);
      if (!s.shaking) return state;
      return withSide(state, action.side, { ...s, shaking: false });
    }
    case "grade": {
      if (!canChangeGrade(state)) return state;
      if (action.band === state.band) return state;
      return {
        ...state,
        band: action.band,
        position: 0,
        winner: null,
        lastPuller: null,
        blue: freshSide(action.band, state.blue.score),
        red: freshSide(action.band, state.red.score),
      };
    }
    case "playAgain":
      return {
        ...state,
        position: 0,
        winner: null,
        lastPuller: null,
        blue: freshSide(state.band, state.blue.score),
        red: freshSide(state.band, state.red.score),
      };
    case "resetAll":
      return createInitialState(state.band);
    default:
      return state;
  }
}
