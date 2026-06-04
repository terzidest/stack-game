import { describe, it, expect } from "@jest/globals";
import {
  freshWorld,
  spawnCurrent,
  updateWorld,
  dropBlock,
} from "./logic";
import { BASE_SPEED } from "./constants";
import type { World } from "./types";

// Fixed dimensions for predictable geometry.
// baseW = 400 * 0.55 = 220; base block spans x = 90 .. 310.
const W = 400;
const H = 800;

function newGame(): World {
  const world = freshWorld(W, H);
  spawnCurrent(world);
  return world;
}

describe("dropBlock", () => {
  it("returns 'miss' when there is no current block", () => {
    const world = freshWorld(W, H);
    expect(world.current).toBeNull();
    expect(dropBlock(world, W, H)).toBe("miss");
  });

  it("perfect drop keeps full width, no debris, bumps score + combo", () => {
    const world = newGame();
    const below = world.blocks[0];
    // Align within PERFECT tolerance (exactly on top).
    world.current!.x = below.x;

    expect(dropBlock(world, W, H)).toBe("perfect");
    expect(world.blocks).toHaveLength(2);
    expect(world.blocks[1].width).toBe(below.width); // no shrink
    expect(world.blocks[1].x).toBe(below.x);
    expect(world.blocks[1].squash).toBe(1); // landing squash armed
    expect(world.debris).toHaveLength(0); // perfect never spawns debris
    expect(world.pulses).toHaveLength(1);
    expect(world.score).toBe(1);
    expect(world.combo).toBe(1);
    expect(world.shake).toBe(0); // perfect doesn't shake
  });

  it("partial overlap slices the block and spawns overhang debris", () => {
    const world = newGame();
    const below = world.blocks[0]; // x=90, width=220 -> 90..310
    world.current!.x = below.x + 50; // 140..360, overlap = 140..310 = 170

    expect(dropBlock(world, W, H)).toBe("placed");
    expect(world.blocks).toHaveLength(2);
    expect(world.blocks[1].x).toBe(140);
    expect(world.blocks[1].width).toBe(170);
    expect(world.blocks[1].squash).toBe(1);
    // Only a right overhang (360 > 310); left edges coincide at 140.
    expect(world.debris).toHaveLength(1);
    expect(world.debris[0].width).toBe(50);
    expect(world.score).toBe(1);
    expect(world.combo).toBe(0); // a non-perfect resets the streak
    expect(world.shake).toBe(4);
  });

  it("zero overlap is a miss: no new block, larger shake, combo reset", () => {
    const world = newGame();
    world.combo = 3;
    world.current!.x = 320; // 320..540, below is 90..310 -> no overlap

    expect(dropBlock(world, W, H)).toBe("miss");
    expect(world.blocks).toHaveLength(1); // nothing placed
    expect(world.score).toBe(0);
    expect(world.combo).toBe(0);
    expect(world.shake).toBe(10);
  });

  it("consecutive perfects accumulate combo and scale pulse intensity", () => {
    const world = newGame();
    world.current!.x = world.blocks[0].x;
    dropBlock(world, W, H); // combo 1
    // spawnCurrent reset the current block; realign onto the new top.
    world.current!.x = world.blocks[1].x;
    dropBlock(world, W, H); // combo 2

    expect(world.combo).toBe(2);
    expect(world.pulses).toHaveLength(2);
    // intensity = 1 + min(combo-1, 4) * 0.4
    expect(world.pulses[0].intensity).toBeCloseTo(1.0);
    expect(world.pulses[1].intensity).toBeCloseTo(1.4);
  });
});

describe("updateWorld", () => {
  it("advances the current block by dir * speed * dt (deterministic)", () => {
    const world = newGame();
    const c = world.current!;
    c.x = 100;
    c.dir = 1;
    const speed = c.speed;
    expect(speed).toBeCloseTo(BASE_SPEED); // score 0 -> base speed

    updateWorld(world, W, H, 10);
    expect(c.x).toBeCloseTo(100 + speed * 10);
  });

  it("is frame-rate independent: one big step == two half steps", () => {
    const a = newGame();
    const b = newGame();
    a.current!.x = 100;
    b.current!.x = 100;

    updateWorld(a, W, H, 20);
    updateWorld(b, W, H, 10);
    updateWorld(b, W, H, 10);

    expect(a.current!.x).toBeCloseTo(b.current!.x);
  });

  it("bounces the current block off the right wall", () => {
    const world = newGame();
    const c = world.current!;
    c.x = W - c.width; // flush against the right wall
    c.dir = 1;

    updateWorld(world, W, H, 16);
    expect(c.dir).toBe(-1);
    expect(c.x).toBeLessThanOrEqual(W - c.width);
  });

  it("decays block squash toward 0 over ~350ms", () => {
    const world = newGame();
    world.blocks[0].squash = 1;

    updateWorld(world, W, H, 175);
    expect(world.blocks[0].squash).toBeCloseTo(0.5);

    updateWorld(world, W, H, 175);
    expect(world.blocks[0].squash).toBe(0); // clamped, not negative
  });

  it("decays screen shake toward 0 and never goes negative", () => {
    const world = newGame();
    world.shake = 10;

    updateWorld(world, W, H, 16);
    expect(world.shake).toBeCloseTo(10 - 16 * 0.025);

    updateWorld(world, W, H, 100000);
    expect(world.shake).toBe(0);
  });
});
