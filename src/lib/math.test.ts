import { describe, expect, it } from "vitest";
import {
  GRADE_BANDS,
  bandAllowsNegative,
  makeQuestion,
  type GradeBand,
} from "@/lib/math";

const SAMPLE = 80;

const OPS = ["+", "−", "×", "÷"] as const;

function samples(band: GradeBand, n = SAMPLE) {
  return Array.from({ length: n }, () => makeQuestion(band));
}

describe("bandAllowsNegative", () => {
  it("is false only for 4-5", () => {
    expect(bandAllowsNegative("4-5")).toBe(false);
    expect(bandAllowsNegative("6-7")).toBe(true);
    expect(bandAllowsNegative("8-9")).toBe(true);
    expect(bandAllowsNegative("10-12")).toBe(true);
  });
});

describe("makeQuestion 4-5", () => {
  it("answers are non-negative integers and prompts have no signed operands", () => {
    const qs = samples("4-5");
    for (const q of qs) {
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.prompt).not.toMatch(/[xy]/);
      expect(q.prompt).not.toMatch(/^\−/);
      expect(q.prompt).not.toContain("(−");
    }
  });

  it("covers all four operators over many samples", () => {
    const qs = samples("4-5", 200);
    for (const op of OPS) {
      expect(qs.some((q) => q.prompt.includes(` ${op} `))).toBe(true);
    }
  });
});

describe("makeQuestion 6-7", () => {
  it("produces integer answers and can include negatives", () => {
    const qs = samples("6-7", 200);
    for (const q of qs) {
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.prompt).not.toMatch(/[xy]/);
    }
    const hasNegPrompt = qs.some(
      (q) => q.prompt.startsWith("−") || q.prompt.includes("(−"),
    );
    const hasNegAnswer = qs.some((q) => q.answer < 0);
    expect(hasNegPrompt || hasNegAnswer).toBe(true);
  });

  it("keeps displayed operands within 0–100 magnitude", () => {
    const qs = samples("6-7", 300);
    for (const q of qs) {
      const nums = [...q.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      for (const n of nums) {
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("makeQuestion 4-5 displayed range", () => {
  it("keeps displayed operands within 0–40", () => {
    const qs = samples("4-5", 300);
    for (const q of qs) {
      const nums = [...q.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      for (const n of nums) {
        expect(n).toBeLessThanOrEqual(40);
      }
    }
  });
});

describe("makeQuestion 8-9", () => {
  it("mixes arithmetic and variable prompts", () => {
    const qs = samples("8-9", 200);
    for (const q of qs) {
      expect(Number.isInteger(q.answer)).toBe(true);
    }
    const withVar = qs.filter((q) => /[xy]/.test(q.prompt));
    const withoutVar = qs.filter((q) => !/[xy]/.test(q.prompt));
    expect(withVar.length).toBeGreaterThan(0);
    expect(withoutVar.length).toBeGreaterThan(0);
    expect(withVar.some((q) => q.prompt.includes("="))).toBe(true);
  });
});

describe("makeQuestion 10-12", () => {
  it("favors trickier variable forms with integers", () => {
    const qs = samples("10-12", 200);
    for (const q of qs) {
      expect(Number.isInteger(q.answer)).toBe(true);
    }
    const withVar = qs.filter((q) => /[xy]/.test(q.prompt));
    expect(withVar.length).toBeGreaterThan(qs.length / 2);
    expect(withVar.some((q) => q.prompt.includes("("))).toBe(true);
  });
});

describe("GRADE_BANDS", () => {
  it("lists all four bands", () => {
    expect(GRADE_BANDS.map((g) => g.id)).toEqual([
      "4-5",
      "6-7",
      "8-9",
      "10-12",
    ]);
  });
});
