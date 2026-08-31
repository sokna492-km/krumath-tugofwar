export type Question = {
  a: number;
  b: number;
  symbol: "+" | "−" | "×" | "÷";
  answer: number;
};

export type GradeBand = "4-5" | "6-7" | "8-9" | "10-12";

export const GRADE_BANDS: { id: GradeBand; label: string }[] = [
  { id: "4-5", label: "4–5" },
  { id: "6-7", label: "6–7" },
  { id: "8-9", label: "8–9" },
  { id: "10-12", label: "10–12" },
];

/** True when a band can produce negative answers (needs the ± key). */
export const bandAllowsNegative = (band: GradeBand) => band !== "4-5";

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

type BandConfig = {
  add: [number, number];
  sub: [number, number];
  subAllowNegative: boolean;
  mulA: [number, number];
  mulB: [number, number];
  divDivisor: [number, number];
  divQuotient: [number, number];
};

const BAND_CONFIG: Record<GradeBand, BandConfig> = {
  "4-5": {
    add: [10, 99],
    sub: [10, 99],
    subAllowNegative: false,
    mulA: [2, 9],
    mulB: [2, 9],
    divDivisor: [2, 9],
    divQuotient: [2, 9],
  },
  "6-7": {
    add: [50, 499],
    sub: [20, 199],
    subAllowNegative: true,
    mulA: [4, 15],
    mulB: [3, 12],
    divDivisor: [3, 12],
    divQuotient: [4, 15],
  },
  "8-9": {
    add: [100, 999],
    sub: [100, 999],
    subAllowNegative: true,
    mulA: [6, 19],
    mulB: [4, 15],
    divDivisor: [6, 19],
    divQuotient: [6, 25],
  },
  "10-12": {
    add: [250, 2500],
    sub: [100, 999],
    subAllowNegative: true,
    mulA: [12, 49],
    mulB: [12, 29],
    divDivisor: [11, 39],
    divQuotient: [11, 49],
  },
};

export function makeQuestion(band: GradeBand = "4-5"): Question {
  const cfg = BAND_CONFIG[band];
  const kind = rand(0, 3);
  if (kind === 0) {
    const a = rand(...cfg.add);
    const b = rand(...cfg.add);
    return { a, b, symbol: "+", answer: a + b };
  }
  if (kind === 1) {
    let a = rand(...cfg.sub);
    let b = rand(...cfg.sub);
    if (!cfg.subAllowNegative && b >= a) {
      [a, b] = [b + 1, a];
    }
    return { a, b, symbol: "−", answer: a - b };
  }
  if (kind === 2) {
    const a = rand(...cfg.mulA);
    const b = rand(...cfg.mulB);
    return { a, b, symbol: "×", answer: a * b };
  }
  const b = rand(...cfg.divDivisor);
  const answer = rand(...cfg.divQuotient);
  return { a: b * answer, b, symbol: "÷", answer };
}
