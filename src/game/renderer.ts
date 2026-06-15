import {
  Skia,
  BlurStyle,
  TileMode,
} from "@shopify/react-native-skia";
import type { SkCanvas } from "@shopify/react-native-skia";
import {
  BLOCK_H,
  FLASH_ALPHA,
  GLOW_SIGMA,
  GLOW_ALPHA,
  SKY_PX,
  SKY_DARKEN_PER_PX,
  SKY_DARKEN_MAX,
} from "./constants";
import { hue, screenTop } from "./logic";
import type { World } from "./types";

// Module-scope paints — created once, mutated before each draw call.
const _bodyPaint = Skia.Paint();
const _flashPaint = Skia.Paint(); // white hit-pop overlay (alpha set per draw)
const _spacePaint = Skia.Paint(); // climb-darkening overlay (alpha set per frame)

// Dusk sky: a vertical gradient (dark navy up top → indigo at the base). One
// shader serves every frame; the span is fixed (SKY_PX) so it builds at module
// scope like _shadePaint, and TileMode.Clamp holds the base color on taller
// screens. The climb-toward-space darkening is a separate alpha overlay below.
const _skyPaint = Skia.Paint();
_skyPaint.setShader(
  Skia.Shader.MakeLinearGradient(
    { x: 0, y: 0 },
    { x: 0, y: SKY_PX },
    [
      new Float32Array([0.114, 0.247, 0.431, 1]), // top  #1d3f6e — sky blue
      new Float32Array([0.357, 0.561, 0.769, 1]), // base #5b8fc4 — light hazy blue
    ],
    [0, 1],
    TileMode.Clamp
  )
);

// Smooth vertical gradient as a hue-independent shading overlay: lighten the
// top, darken the bottom. One shader serves every block (drawn in block-local
// space), so there's no per-frame/per-hue allocation.
const _shadePaint = Skia.Paint();
_shadePaint.setShader(
  Skia.Shader.MakeLinearGradient(
    { x: 0, y: 0 },
    { x: 0, y: BLOCK_H },
    [
      new Float32Array([1, 1, 1, 0.16]), // top: subtle highlight
      new Float32Array([1, 1, 1, 0]), // mid: untouched body
      new Float32Array([0, 0, 0, 0.3]), // bottom: shadow
    ],
    [0, 0.5, 1],
    TileMode.Clamp
  )
);

// Colored bloom behind perfect drops (color set per pulse).
const _glowPaint = Skia.Paint();
_glowPaint.setMaskFilter(
  Skia.MaskFilter.MakeBlur(BlurStyle.Normal, GLOW_SIGMA, true)
);

function hslColor(
  h: number,
  s: number,
  l: number,
  a: number = 1
): Float32Array {
  "worklet";
  const sp = s / 100;
  const lp = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const ap = sp * Math.min(lp, 1 - lp);
  const f = (n: number) =>
    lp - ap * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return new Float32Array([f(0), f(8), f(4), a]);
}

function drawBlock(
  canvas: SkCanvas,
  x: number,
  y: number,
  width: number,
  h: number,
  alpha: number,
  squash: number = 0,
  perfect: boolean = false
): void {
  "worklet";
  if (width <= 0) return;

  const r = Math.min(4, width / 2, BLOCK_H / 2);

  // Work in block-local space (origin at top-left) so the shared gradient
  // shader and the squash pivot line up regardless of where the block is.
  canvas.save();
  canvas.translate(x, y);

  if (squash > 0) {
    const phase = (1 - squash) * Math.PI * 2;
    const deform = squash * Math.cos(phase) * 0.25;
    canvas.translate(width / 2, BLOCK_H);
    canvas.scale(1 + deform * 0.4, 1 - deform);
    canvas.translate(-width / 2, -BLOCK_H);
  }

  const rect = Skia.RRectXY(Skia.XYWHRect(0, 0, width, BLOCK_H), r, r);

  // Flat body
  _bodyPaint.setColor(hslColor(h, 62, 54, alpha));
  canvas.drawRRect(rect, _bodyPaint);

  // Smooth gradient shading (solid blocks only; debris stays flat).
  if (alpha >= 1) {
    canvas.drawRRect(rect, _shadePaint);
  }

  // Hit-pop: perfect landings flash white, fading as squash decays.
  if (perfect && squash > 0) {
    _flashPaint.setColor(hslColor(0, 0, 100, squash * FLASH_ALPHA));
    canvas.drawRRect(rect, _flashPaint);
  }

  canvas.restore();
}

export function drawWorld(
  canvas: SkCanvas,
  world: World,
  W: number,
  H: number,
  floorH: number = H
): void {
  "worklet";

  // The sky fills the full canvas (H, edge-to-edge); the tower sits on floorH —
  // the visible floor above the Android nav bar (floorH === H on iOS).
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), _skyPaint);
  const dark = Math.min(SKY_DARKEN_MAX, world.cameraY * SKY_DARKEN_PER_PX);
  if (dark > 0.001) {
    _spacePaint.setColor(hslColor(230, 60, 5, dark));
    canvas.drawRect(Skia.XYWHRect(0, 0, W, H), _spacePaint);
  }

  const shaking = world.shake > 0.5;
  if (shaking) {
    canvas.save();
    canvas.translate(
      (Math.random() * 2 - 1) * world.shake,
      (Math.random() * 2 - 1) * world.shake * 0.6
    );
  }

  // Perfect glow blooms — behind the tower so they radiate from around the block.
  for (let i = 0; i < world.pulses.length; i++) {
    const p = world.pulses[i];
    const intensity = p.intensity ?? 1;
    const a = Math.min(1, p.life * GLOW_ALPHA * intensity);
    _glowPaint.setColor(hslColor(180, 70, 70, a));
    const gw = p.w * (0.9 + 0.3 * intensity);
    const gr = Math.min(6, gw / 2);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(p.sx - gw / 2, p.sy, gw, BLOCK_H), gr, gr),
      _glowPaint
    );
  }

  for (let i = 0; i < world.blocks.length; i++) {
    const b = world.blocks[i];
    drawBlock(canvas, b.x, screenTop(i, world, floorH), b.width, hue(i), 1, b.squash ?? 0, b.perfect ?? false);
  }

  if (world.current) {
    const y = screenTop(world.blocks.length, world, floorH);
    drawBlock(canvas, world.current.x, y, world.current.width, hue(world.blocks.length), 1, 0);
  }

  for (let i = 0; i < world.debris.length; i++) {
    const d = world.debris[i];
    canvas.save();
    canvas.translate(d.sx + d.width / 2, d.sy + BLOCK_H / 2);
    canvas.rotate((d.rot * 180) / Math.PI, 0, 0);
    drawBlock(canvas, -d.width / 2, -BLOCK_H / 2, d.width, d.hue, Math.max(0, d.alpha), 0);
    canvas.restore();
  }

  if (shaking) {
    canvas.restore();
  }
}
