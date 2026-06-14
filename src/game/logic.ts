import {
  BLOCK_H,
  PERFECT,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_STEP,
  GRAVITY,
  DUST_COUNT,
  DUST_COMBO_BONUS,
  DUST_COMBO_CAP,
  DUST_DECAY,
} from "./constants";
import type { World, Block, Current, Debris, Dust } from "./types";

export type DropResult = "perfect" | "placed" | "miss";

export function hue(i: number): number {
  "worklet";
  return (192 + i * 9) % 360;
}

export function screenTop(index: number, world: World, H: number): number {
  "worklet";
  return H - (index + 1) * BLOCK_H + world.cameraY;
}

export function freshWorld(W: number, H: number): World {
  "worklet";
  const baseW = W * 0.55;
  return {
    blocks: [{ x: (W - baseW) / 2, width: baseW }],
    current: null,
    debris: [],
    pulses: [],
    dust: [],
    cameraY: 0,
    score: 0,
    shake: 0,
    combo: 0,
    maxCombo: 0,
  };
}

export function spawnCurrent(world: World): void {
  "worklet";
  const top = world.blocks[world.blocks.length - 1];
  world.current = {
    x: 0,
    width: top.width,
    dir: 1,
    speed: Math.min(MAX_SPEED, BASE_SPEED + world.score * SPEED_STEP),
  };
}

export function updateWorld(
  world: World,
  W: number,
  H: number,
  dt: number
): void {
  "worklet";
  const c = world.current;
  if (!c) return;

  // Move current block + bounce off walls
  c.x += c.dir * c.speed * dt;
  if (c.x <= 0) {
    c.x = 0;
    c.dir = 1;
  } else if (c.x + c.width >= W) {
    c.x = W - c.width;
    c.dir = -1;
  }

  // Camera glides up so the active block stays ~1/3 down the screen
  const target = Math.max(
    0,
    (world.blocks.length + 1) * BLOCK_H - H * 0.68
  );
  world.cameraY += (target - world.cameraY) * Math.min(1, dt * 0.008);

  // Squash decay on all blocks
  for (let i = 0; i < world.blocks.length; i++) {
    const b = world.blocks[i];
    if (b.squash) {
      b.squash = Math.max(0, b.squash - dt / 350);
    }
  }

  // Shake decay
  if (world.shake > 0) {
    world.shake = Math.max(0, world.shake - dt * 0.025);
  }

  // Debris physics
  const keepDebris: Debris[] = [];
  for (let i = 0; i < world.debris.length; i++) {
    const d = world.debris[i];
    d.vy += GRAVITY * dt;
    d.sy += d.vy * dt;
    d.sx += d.vx * dt;
    d.rot += d.vr * dt;
    d.alpha -= dt * 0.0014;
    if (d.alpha > 0 && d.sy < H + 80) {
      keepDebris.push(d);
    }
  }
  world.debris = keepDebris;

  // Dust physics (perfect-land kick)
  const keepDust: Dust[] = [];
  for (let i = 0; i < world.dust.length; i++) {
    const p = world.dust[i];
    p.vy += GRAVITY * dt;
    p.sy += p.vy * dt;
    p.sx += p.vx * dt;
    p.life -= DUST_DECAY * dt;
    if (p.life > 0) {
      keepDust.push(p);
    }
  }
  world.dust = keepDust;

  // Pulse decay
  const keepPulses = [];
  for (let i = 0; i < world.pulses.length; i++) {
    world.pulses[i].life -= dt * 0.004;
    if (world.pulses[i].life > 0) {
      keepPulses.push(world.pulses[i]);
    }
  }
  world.pulses = keepPulses;
}

export function dropBlock(world: World, W: number, H: number): DropResult {
  "worklet";
  const c = world.current;
  if (!c) return "miss";

  const below = world.blocks[world.blocks.length - 1];

  // Perfect drop: snap to full width, no shrink
  if (Math.abs(c.x - below.x) <= PERFECT) {
    world.combo++;
    const intensity = 1 + Math.min(world.combo - 1, 4) * 0.4;
    const newBlock: import("./types").Block = { x: below.x, width: below.width, squash: 1 };
    world.blocks.push(newBlock);
    const idx = world.blocks.length - 1;
    const sy = screenTop(idx, world, H);
    world.pulses.push({
      sx: below.x + below.width / 2,
      sy,
      w: below.width,
      life: 1,
      intensity,
    });
    // Dust kick on a clean land (perfect only — placed already throws debris).
    // Deterministic fan (no randomness) so the sim stays replayable; more dust
    // as the streak grows.
    const cx = below.x + below.width / 2;
    const contactY = sy + BLOCK_H;
    const count =
      DUST_COUNT + Math.min(world.combo, DUST_COMBO_CAP) * DUST_COMBO_BONUS;
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const t = (i + 1) / (count + 1); // 0..1 spread factor
      const wobble = ((i * 7) % 5) / 5; // deterministic 0..0.8 variation
      world.dust.push({
        sx: cx + dir * t * 10,
        sy: contactY,
        vx: dir * (0.04 + 0.1 * t),
        vy: -(0.1 + 0.06 * wobble),
        life: 1,
        size: 2 + (i % 3),
      });
    }
    world.maxCombo = Math.max(world.maxCombo, world.combo);
    world.score += 1 + world.combo; // 1st perfect +2, 2nd +3, 3rd +4 …
    spawnCurrent(world);
    return "perfect";
  }

  // Calculate overlap
  const left = Math.max(c.x, below.x);
  const right = Math.min(c.x + c.width, below.x + below.width);
  const overlap = right - left;

  if (overlap <= 0) {
    world.shake = 10;
    world.combo = 0;
    return "miss";
  }

  world.combo = 0;
  world.shake = 4;

  const idx = world.blocks.length;
  const placedTop = screenTop(idx, world, H);
  const h = hue(idx);

  // Left overhang -> debris
  if (c.x < left) {
    world.debris.push({
      sx: c.x,
      sy: placedTop,
      width: left - c.x,
      hue: h,
      vx: -0.12,
      vy: 0,
      rot: 0,
      vr: -0.12 * 0.004,
      alpha: 1,
    });
  }

  // Right overhang -> debris
  if (c.x + c.width > right) {
    world.debris.push({
      sx: right,
      sy: placedTop,
      width: c.x + c.width - right,
      hue: h,
      vx: 0.12,
      vy: 0,
      rot: 0,
      vr: 0.12 * 0.004,
      alpha: 1,
    });
  }

  world.blocks.push({ x: left, width: overlap, squash: 1 });
  world.score += 1;
  spawnCurrent(world);
  return "placed";
}
