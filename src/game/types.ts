export type Phase = "idle" | "playing" | "paused" | "over";

export interface Block {
  x: number;
  width: number;
  squash?: number; // 1 = just landed, decays to 0 over ~350ms
}

export interface Current extends Block {
  dir: 1 | -1;
  speed: number;
}

export interface Debris {
  sx: number;
  sy: number;
  width: number;
  hue: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  alpha: number;
}

export interface Pulse {
  sx: number;
  sy: number;
  w: number;
  life: number;
  intensity: number; // scales flash brightness & grow with combo
}

export interface World {
  blocks: Block[];
  current: Current | null;
  debris: Debris[];
  pulses: Pulse[];
  cameraY: number;
  score: number;
  shake: number; // pixel amplitude, decays to 0
  combo: number; // current perfect-drop streak
  maxCombo: number; // longest perfect streak this run
}
