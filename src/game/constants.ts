export const BLOCK_H = 28;
export const PERFECT = 4;
export const BASE_SPEED = 0.17;
export const MAX_SPEED = 0.5;
export const SPEED_STEP = 0.006;
export const GRAVITY = 0.0024;

// --- FX tuning ---
export const FLASH_ALPHA = 0.3; // peak white-overlay opacity at squash=1 (hit-pop)
export const DUST_COUNT = 7; // base dust particles per perfect
export const DUST_COMBO_BONUS = 2; // extra particles per combo step
export const DUST_COMBO_CAP = 5; // combo beyond which dust stops scaling
export const DUST_DECAY = 0.003; // life lost per ms (~0.33s lifetime)
export const GLOW_SIGMA = 12; // perfect glow blur radius
export const GLOW_ALPHA = 0.5; // perfect glow peak opacity
