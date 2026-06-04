import { Skia } from "@shopify/react-native-skia";
import type { SkCanvas } from "@shopify/react-native-skia";
import { BLOCK_H } from "./constants";
import { hue, screenTop } from "./logic";
import type { World } from "./types";

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
  alpha: number
): void {
  "worklet";
  if (width <= 0) return;
  const r = Math.min(4, width / 2, BLOCK_H / 2);

  const bodyPaint = Skia.Paint();
  bodyPaint.setColor(hslColor(h, 62, 56, alpha));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x, y, width, BLOCK_H), r, r),
    bodyPaint
  );

  const hlPaint = Skia.Paint();
  hlPaint.setColor(hslColor(h, 70, 70, alpha));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x, y, width, Math.min(4, BLOCK_H)), r, r),
    hlPaint
  );
}

export function drawWorld(
  canvas: SkCanvas,
  world: World,
  W: number,
  H: number
): void {
  "worklet";

  const bg = Skia.Paint();
  bg.setColor(Skia.Color("#0d0f14"));
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), bg);

  for (let i = 0; i < world.blocks.length; i++) {
    const b = world.blocks[i];
    drawBlock(canvas, b.x, screenTop(i, world, H), b.width, hue(i), 1);
  }

  if (world.current) {
    const y = screenTop(world.blocks.length, world, H);
    drawBlock(canvas, world.current.x, y, world.current.width, hue(world.blocks.length), 1);
  }

  for (let i = 0; i < world.debris.length; i++) {
    const d = world.debris[i];
    canvas.save();
    canvas.translate(d.sx + d.width / 2, d.sy + BLOCK_H / 2);
    canvas.rotate((d.rot * 180) / Math.PI, 0, 0);
    drawBlock(canvas, -d.width / 2, -BLOCK_H / 2, d.width, d.hue, Math.max(0, d.alpha));
    canvas.restore();
  }

  const sp = Skia.Paint();
  sp.setStyle(1);
  sp.setStrokeWidth(2);
  sp.setColor(Skia.Color("#ffffff"));
  for (let i = 0; i < world.pulses.length; i++) {
    const p = world.pulses[i];
    sp.setAlphaf(p.life * 0.7);
    const g = (1 - p.life) * 22;
    canvas.drawRect(
      Skia.XYWHRect(p.sx - p.w / 2 - g, p.sy - g, p.w + g * 2, BLOCK_H + g * 2),
      sp
    );
  }
}
