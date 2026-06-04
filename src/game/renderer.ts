import { Skia, PaintStyle } from "@shopify/react-native-skia";
import type { SkCanvas } from "@shopify/react-native-skia";
import { BLOCK_H } from "./constants";
import { hue, screenTop } from "./logic";
import type { World } from "./types";

// Module-scope paints — created once, mutated before each draw call.
const _bgPaint = Skia.Paint();
const _bodyPaint = Skia.Paint();
const _hlPaint = Skia.Paint();
const _strokePaint = Skia.Paint();
_strokePaint.setStyle(PaintStyle.Stroke);
_strokePaint.setStrokeWidth(2);
_strokePaint.setColor(Skia.Color("#ffffff"));

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
  squash: number = 0
): void {
  "worklet";
  if (width <= 0) return;

  if (squash > 0) {
    const phase = (1 - squash) * Math.PI * 2;
    const deform = squash * Math.cos(phase) * 0.25;
    const scaleY = 1 - deform;
    const scaleX = 1 + deform * 0.4;
    canvas.save();
    // Pivot at bottom-centre of block
    canvas.translate(x + width / 2, y + BLOCK_H);
    canvas.scale(scaleX, scaleY);
    canvas.translate(-(x + width / 2), -(y + BLOCK_H));
  }

  const r = Math.min(4, width / 2, BLOCK_H / 2);

  _bodyPaint.setColor(hslColor(h, 62, 56, alpha));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x, y, width, BLOCK_H), r, r),
    _bodyPaint
  );

  _hlPaint.setColor(hslColor(h, 70, 70, alpha));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x, y, width, Math.min(4, BLOCK_H)), r, r),
    _hlPaint
  );

  if (squash > 0) {
    canvas.restore();
  }
}

export function drawWorld(
  canvas: SkCanvas,
  world: World,
  W: number,
  H: number
): void {
  "worklet";

  _bgPaint.setColor(Skia.Color("#0d0f14"));
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), _bgPaint);

  const shaking = world.shake > 0.5;
  if (shaking) {
    canvas.save();
    canvas.translate(
      (Math.random() * 2 - 1) * world.shake,
      (Math.random() * 2 - 1) * world.shake * 0.6
    );
  }

  for (let i = 0; i < world.blocks.length; i++) {
    const b = world.blocks[i];
    drawBlock(canvas, b.x, screenTop(i, world, H), b.width, hue(i), 1, b.squash ?? 0);
  }

  if (world.current) {
    const y = screenTop(world.blocks.length, world, H);
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

  for (let i = 0; i < world.pulses.length; i++) {
    const p = world.pulses[i];
    const intensity = p.intensity ?? 1;
    _strokePaint.setAlphaf(Math.min(1, p.life * 0.7 * intensity));
    const g = (1 - p.life) * 22 * intensity;
    canvas.drawRect(
      Skia.XYWHRect(p.sx - p.w / 2 - g, p.sy - g, p.w + g * 2, BLOCK_H + g * 2),
      _strokePaint
    );
  }

  if (shaking) {
    canvas.restore();
  }
}
