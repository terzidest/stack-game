// Platform glue: persistent storage on the JS thread via MMKV (synchronous, so
// the high score reads at startup with no async flicker). Invoked at mount and
// at game-over only — never in the per-frame path. Not unit-tested (imports the
// native module); the decision logic it delegates to lives in ./highScore.

import { createMMKV } from "react-native-mmkv";
import { isNewRecord, pickBest } from "./highScore";

const store = createMMKV();
const HIGH_SCORE_KEY = "highScore";

export function loadHighScore(): number {
  return store.getNumber(HIGH_SCORE_KEY) ?? 0;
}

export function commitScore(score: number): {
  best: number;
  isNewRecord: boolean;
} {
  const prev = loadHighScore();
  const record = isNewRecord(prev, score);
  const best = pickBest(prev, score);
  if (record) store.set(HIGH_SCORE_KEY, best);
  return { best, isNewRecord: record };
}
