// stack.ts — Stack-the-blocks. Single-file canvas game.
// Architecture: a phase state machine + a mutable `world` object updated by a
// requestAnimationFrame loop with delta time. In a React app, `world` lives in a
// useRef (never useState — it changes ~60x/sec); React renders only the phase shell.

type Phase = "idle" | "playing" | "over";

interface Block { x: number; width: number; }
interface Current extends Block { dir: 1 | -1; speed: number; }
interface Debris { sx: number; sy: number; width: number; color: number; vx: number; vy: number; rot: number; vr: number; alpha: number; }
interface Pulse { sx: number; sy: number; w: number; life: number; }

interface World {
  blocks: Block[];
  current: Current | null;
  debris: Debris[];
  pulses: Pulse[];
  cameraY: number;
  score: number;
}

const BLOCK_H = 28;
const PERFECT = 4;
const BASE_SPEED = 0.17;
const MAX_SPEED = 0.5;
const SPEED_STEP = 0.011;
const GRAVITY = 0.0024;

export function createGame(canvas: HTMLCanvasElement, onScore: (n: number) => void, onGameOver: (score: number) => void) {
  const ctx = canvas.getContext("2d")!;
  let W = 0, H = 0, dpr = 1;
  let phase: Phase = "idle";
  let world: World = freshWorld();
  let last = 0;

  function freshWorld(): World {
    const baseW = W * 0.55;
    return { blocks: [{ x: (W - baseW) / 2, width: baseW }], current: null, debris: [], pulses: [], cameraY: 0, score: 0 };
  }

  const hue = (i: number) => (192 + i * 9) % 360;
  const screenTop = (index: number) => H - (index + 1) * BLOCK_H + world.cameraY;

  function spawnCurrent() {
    const top = world.blocks[world.blocks.length - 1];
    world.current = { x: 0, width: top.width, dir: 1, speed: Math.min(MAX_SPEED, BASE_SPEED + world.score * SPEED_STEP) };
  }

  function update(dt: number) {
    const c = world.current!;
    c.x += c.dir * c.speed * dt;
    if (c.x <= 0) { c.x = 0; c.dir = 1; }
    else if (c.x + c.width >= W) { c.x = W - c.width; c.dir = -1; }

    const target = Math.max(0, (world.blocks.length + 1) * BLOCK_H - H * 0.68);
    world.cameraY += (target - world.cameraY) * Math.min(1, dt * 0.008);

    for (const d of world.debris) { d.vy += GRAVITY * dt; d.sy += d.vy * dt; d.sx += d.vx * dt; d.rot += d.vr * dt; d.alpha -= dt * 0.0014; }
    world.debris = world.debris.filter(d => d.alpha > 0 && d.sy < H + 80);
    for (const p of world.pulses) p.life -= dt * 0.004;
    world.pulses = world.pulses.filter(p => p.life > 0);
  }

  function drop() {
    const c = world.current!;
    const below = world.blocks[world.blocks.length - 1];

    if (Math.abs(c.x - below.x) <= PERFECT) {
      world.blocks.push({ x: below.x, width: below.width });
      world.pulses.push({ sx: below.x + below.width / 2, sy: screenTop(world.blocks.length - 1), w: below.width, life: 1 });
      bumpScore(); spawnCurrent(); return;
    }

    const left = Math.max(c.x, below.x);
    const right = Math.min(c.x + c.width, below.x + below.width);
    const overlap = right - left;
    if (overlap <= 0) { gameOver(); return; }

    const idx = world.blocks.length;
    const placedTop = H - (idx + 1) * BLOCK_H + world.cameraY;
    if (c.x < left) fling(c.x, placedTop, left - c.x, idx, -0.12);
    if (c.x + c.width > right) fling(right, placedTop, c.x + c.width - right, idx, 0.12);

    world.blocks.push({ x: left, width: overlap });
    bumpScore(); spawnCurrent();
  }

  const bumpScore = () => { world.score++; onScore(world.score); };
  const fling = (x: number, sy: number, width: number, idx: number, vx: number) =>
    world.debris.push({ sx: x, sy, width, color: hue(idx), vx, vy: 0, rot: 0, vr: vx * 0.004, alpha: 1 });

  function render() {
    ctx.clearRect(0, 0, W, H);
    world.blocks.forEach((b, i) => drawBlock(b.x, screenTop(i), b.width, hue(i)));
    if (world.current) drawBlock(world.current.x, screenTop(world.blocks.length), world.current.width, hue(world.blocks.length));

    for (const d of world.debris) {
      ctx.save(); ctx.globalAlpha = Math.max(0, d.alpha);
      ctx.translate(d.sx + d.width / 2, d.sy + BLOCK_H / 2); ctx.rotate(d.rot);
      drawBlock(-d.width / 2, -BLOCK_H / 2, d.width, d.color); ctx.restore();
    }
    for (const p of world.pulses) {
      ctx.save(); ctx.globalAlpha = p.life * 0.7; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      const g = (1 - p.life) * 22;
      ctx.strokeRect(p.sx - p.w / 2 - g, p.sy - g, p.w + g * 2, BLOCK_H + g * 2); ctx.restore();
    }
  }

  function drawBlock(x: number, y: number, width: number, h: number) {
    ctx.fillStyle = `hsl(${h} 62% 56%)`; roundRect(x, y, width, BLOCK_H, 4); ctx.fill();
    ctx.fillStyle = `hsl(${h} 70% 70%)`; roundRect(x, y, width, 4, 4); ctx.fill();
  }
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function loop(t: number) {
    const dt = Math.min(50, t - last); last = t;
    if (phase === "playing") update(dt);
    render(); requestAnimationFrame(loop);
  }

  function start() { world = freshWorld(); spawnCurrent(); onScore(0); phase = "playing"; }
  function gameOver() { phase = "over"; onGameOver(world.score); }
  function tap() { if (phase === "playing") drop(); else start(); }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!world.blocks.length) world = freshWorld();
  }

  new ResizeObserver(resize).observe(canvas);
  resize(); world = freshWorld();
  requestAnimationFrame(t => { last = t; loop(t); });

  return { tap, getPhase: () => phase };
}
