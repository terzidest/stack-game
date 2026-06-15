export const BLOCK_H = 28;
export const PERFECT = 4;
export const BASE_SPEED = 0.17;
export const MAX_SPEED = 0.5;
export const SPEED_STEP = 0.006;
export const GRAVITY = 0.0024;

// --- FX tuning ---
export const FLASH_ALPHA = 0.3; // peak white-overlay opacity at squash=1 (hit-pop)
export const GLOW_SIGMA = 12; // perfect glow blur radius
export const GLOW_ALPHA = 0.5; // perfect glow peak opacity

// --- Sky ---
// Dusk vertical gradient (top dark → base lighter), darkening toward space as
// the camera climbs. Stop colors live in render/renderer.ts (theme); these are
// the scalar tunables.
export const SKY_PX = 850; // gradient span in dp; screens taller than this clamp to the base color
export const SKY_DARKEN_PER_PX = 0.0008; // cameraY → space-overlay alpha (the climb fades the sky toward space)
export const SKY_DARKEN_MAX = 0.7; // never fully black — blocks still need a backdrop
