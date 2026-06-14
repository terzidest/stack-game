import { Skia, PaintStyle, BlurStyle } from "@shopify/react-native-skia";
import type { SkCanvas } from "@shopify/react-native-skia";
import {
  BLOCK_H,
  FLASH_BOOST,
  GLOW_SIGMA,
  GLOW_ALPHA,
  SHADOW_SIGMA,
  SHADOW_ALPHA,
} from "./constants";
import { hue, screenTop } from "./logic";
import type { World } from "./types";

// Module-scope paints — created once, mutated before each draw call.
const _bgPaint = Skia.Paint();
const _bodyPaint = Skia.Paint();
const _bandPaint = Skia.Paint(); // darker bottom band → fake vertical gradient
const _hlPaint = Skia.Paint();
const _strokePaint = Skia.Paint();
_strokePaint.setStyle(PaintStyle.Stroke);
_strokePaint.setStrokeWidth(2);
_strokePaint.setColor(Skia.Color("#ffffff"));

// Soft shadow under the active block (one blur, set up once).
const _shadowPaint = Skia.Paint();
_shadowPaint.setColor(Skia.Color("#000000"));
_shadowPaint.setAlphaf(SHADOW_ALPHA);
_shadowPaint.setMaskFilter(
  Skia.MaskFilter.MakeBlur(BlurStyle.Normal, SHADOW_SIGMA, true)
);

// Colored bloom behind perfect drops (color set per pulse).
const _glowPaint = Skia.Paint();
_glowPaint.setMaskFilter(
  Skia.MaskFilter.MakeBlur(BlurStyle.Normal, GLOW_SIGMA, true)
);

// Perfect-land dust (color/alpha set per particle).
const _dustPaint = Skia.Paint();

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
  // Hit-pop: a freshly-landed block (squash near 1) flashes brighter, fading
  // as squash decays back to 0.
  const flash = squash * FLASH_BOOST;

  // Body (mid tone)
  _bodyPaint.setColor(hslColor(h, 62, 52 + flash, alpha));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x, y, width, BLOCK_H), r, r),
    _bodyPaint
  );

  // Darker bottom band → cheap vertical gradient
  const bandH = BLOCK_H * 0.45;
  _bandPaint.setColor(hslColor(h, 62, 44 + flash * 0.6, alpha));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x, y + BLOCK_H - bandH, width, bandH), r, r),
    _bandPaint
  );

  // Top highlight
  _hlPaint.setColor(hslColor(h, 70, 70 + flash, alpha));
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
    drawBlock(canvas, b.x, screenTop(i, world, H), b.width, hue(i), 1, b.squash ?? 0);
  }

  if (world.current) {
    const y = screenTop(world.blocks.length, world, H);
    // Soft shadow on the active (sliding) block only — gives it depth above the
    // stack. One blur per frame.
    const sw = world.current.width * 0.92;
    canvas.drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(
          world.current.x + (world.current.width - sw) / 2,
          y + BLOCK_H + 3,
          sw,
          BLOCK_H * 0.5
        ),
        6,
        6
      ),
      _shadowPaint
    );
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

  // Perfect-land dust
  for (let i = 0; i < world.dust.length; i++) {
    const d = world.dust[i];
    _dustPaint.setColor(hslColor(195, 50, 85, Math.max(0, d.life)));
    canvas.drawCircle(d.sx, d.sy, d.size, _dustPaint);
  }

  // Perfect shockwave ring (sharp, complements the soft glow)
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
