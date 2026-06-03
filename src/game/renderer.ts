import { Skia, PaintStyle } from "@shopify/react-native-skia";
import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { BLOCK_H } from "./constants";
import { hue, screenTop } from "./logic";
import type { World } from "./types";

/**
 * Convert HSL (h 0-360, s/l 0-100) to a Float32Array RGBA color
 * compatible with Skia's paint.setColor().
 */
function hslColor(h: number, s: number, l: number, a: number = 1): Float32Array {
  const sp = s / 100;
  const lp = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const ap = sp * Math.min(lp, 1 - lp);
  const f = (n: number) =>
    lp - ap * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return new Float32Array([f(0), f(8), f(4), a]);
}

const bgColor = Skia.Color("#0d0f14");
const whiteColor = Skia.Color("#ffffff");

export function drawWorld(
  canvas: SkCanvas,
  world: World,
  W: number,
  H: number
): void {
  const paint = Skia.Paint();
  const highlightPaint = Skia.Paint();

  // Background
  paint.setColor(bgColor);
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), paint);

  // Settled tower
  for (let i = 0; i < world.blocks.length; i++) {
    const b = world.blocks[i];
    const y = screenTop(i, world, H);
    drawBlock(canvas, paint, highlightPaint, b.x, y, b.width, hue(i), 1);
  }

  // Moving block
  if (world.current) {
    const y = screenTop(world.blocks.length, world, H);
    drawBlock(
      canvas, paint, highlightPaint,
      world.current.x, y, world.current.width,
      hue(world.blocks.length), 1
    );
  }

  // Debris
  for (let i = 0; i < world.debris.length; i++) {
    const d = world.debris[i];
    canvas.save();
    canvas.translate(d.sx + d.width / 2, d.sy + BLOCK_H / 2);
    canvas.rotate((d.rot * 180) / Math.PI, 0, 0);
    drawBlock(
      canvas, paint, highlightPaint,
      -d.width / 2, -BLOCK_H / 2, d.width,
      d.hue, Math.max(0, d.alpha)
    );
    canvas.restore();
  }

  // Perfect-drop pulses
  const strokePaint = Skia.Paint();
  strokePaint.setStyle(PaintStyle.Stroke);
  strokePaint.setStrokeWidth(2);
  for (let i = 0; i < world.pulses.length; i++) {
    const p = world.pulses[i];
    strokePaint.setColor(whiteColor);
    strokePaint.setAlphaf(p.life * 0.7);
    const grow = (1 - p.life) * 22;
    canvas.drawRect(
      Skia.XYWHRect(
        p.sx - p.w / 2 - grow,
        p.sy - grow,
        p.w + grow * 2,
        BLOCK_H + grow * 2
      ),
      strokePaint
    );
  }
}

function drawBlock(
  canvas: SkCanvas,
  paint: SkPaint,
  highlightPaint: SkPaint,
  x: number,
  y: number,
  width: number,
  h: number,
  alpha: number
): void {
  if (width <= 0) return;
  const r = Math.min(4, width / 2, BLOCK_H / 2);

  // Main body: hsl(h, 62%, 56%)
  paint.setColor(hslColor(h, 62, 56, alpha));
  const bodyRect = Skia.RRectXY(Skia.XYWHRect(x, y, width, BLOCK_H), r, r);
  canvas.drawRRect(bodyRect, paint);

  // Top-edge highlight: hsl(h, 70%, 70%)
  highlightPaint.setColor(hslColor(h, 70, 70, alpha));
  const hlH = Math.min(4, BLOCK_H);
  const hlRect = Skia.RRectXY(Skia.XYWHRect(x, y, width, hlH), r, r);
  canvas.drawRRect(hlRect, highlightPaint);
}
