// Pure high-score decision logic — no platform imports, so it unit-tests in the
// same Node Jest suite as the domain. JS-thread only (runs at game-over, never
// in the per-frame path), so it is not a worklet.

export function isNewRecord(prev: number, score: number): boolean {
  // Strict: tying your previous best is not a new record.
  return score > prev;
}

export function pickBest(prev: number, score: number): number {
  return Math.max(prev, score);
}
