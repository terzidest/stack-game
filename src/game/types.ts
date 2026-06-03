export type Phase = "idle" | "playing" | "over";

export interface Block {
  x: number;
  width: number;
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
}

export interface World {
  blocks: Block[];
  current: Current | null;
  debris: Debris[];
  pulses: Pulse[];
  cameraY: number;
  score: number;
}
