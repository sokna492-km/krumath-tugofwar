export type Question = {
  a: number;
  b: number;
  symbol: "+" | "−" | "×" | "÷";
  answer: number;
};

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export function makeQuestion(): Question {
  const kind = rand(0, 3);
  if (kind === 0) {
    const a = rand(12, 99);
    const b = rand(12, 99);
    return { a, b, symbol: "+", answer: a + b };
  }
  if (kind === 1) {
    const a = rand(25, 99);
    const b = rand(11, a - 1);
    return { a, b, symbol: "−", answer: a - b };
  }
  if (kind === 2) {
    const a = rand(3, 19);
    const b = rand(3, 12);
    return { a, b, symbol: "×", answer: a * b };
  }
  const b = rand(3, 12);
  const answer = rand(3, 15);
  return { a: b * answer, b, symbol: "÷", answer };
}
