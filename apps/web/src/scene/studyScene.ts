import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture, TilingSprite } from "pixi.js";
import { CAST_ATLAS, CAST_CELLS, MANUSCRIPT_PORTRAITS } from "../site/portraits/atlas";
import type { Portrait } from "../sampleCase/boardCases";
import { gsap } from "gsap";
import {
  CLUES,
  FIND_ITEMS,
  LINKS,
  evidenceById,
  type ClueId,
  type EvidenceId,
  type FindId,
  type LinkId,
  type ReconstructionBeat,
  type SuspectId,
} from "../sampleCase/manuscript";
import { DESIGN_H, DESIGN_W, type StageTransform } from "./studyLayout";

// PixiJS scene for the sample case: the Ashgrove House study on a wet night, drawn entirely in code, so the scene
// ships no raster art. The room lives on its own (rain on the glass, fire, candles, a breathing cast, dust, haze,
// film grain, lightning) and doubles as a hidden-object search: the twelve listed objects are drawn into the
// clutter, and portable ones leave the room when found. Text, the find list, and controls stay in the DOM; this
// canvas is decorative and hidden from assistive technology.
//
// Design space is 1600 x 900, letterboxed to the host box. Every frame reports the camera transform through
// onCamera, so the page's click layer and DOM labels follow the camera exactly. Layers that hold findable objects
// get no parallax offset, which keeps hit-testing exact. Under reduced motion the ticker stays stopped and every
// change paints one still frame with its end state.

export type ScenePhase = "opening" | "investigating" | "solved";
export type SuspectLook = "neutral" | "cleared" | "culprit";

export interface StudyScene {
  setPhase(phase: ScenePhase): void;
  /** Opening spotlight on one suspect, or null to light the whole cast. */
  introduce(suspect: SuspectId | null): void;
  /** Hides already-collected portable objects without animation, for example after a restart. */
  setFound(ids: readonly FindId[]): void;
  setSuspects(states: Record<SuspectId, SuspectLook>): void;
  /** Draws already-found threads without animation. */
  setThreads(links: readonly LinkId[]): void;
  found(id: FindId): void;
  /** A readable close-up from the rendered room, captured before an object leaves. */
  discoveryImage(id: FindId): string | null;
  hintAt(id: FindId): void;
  missAt(x: number, y: number, steady: boolean): void;
  /** The detective walks to a clue, raises the magnifier, and walks back. */
  inspect(clue: ClueId): void;
  linked(link: LinkId): void;
  miss(): void;
  timeline(): void;
  contradiction(clears: SuspectId | null): void;
  hint(): void;
  accusedWrong(suspect: SuspectId): void;
  beat(beat: ReconstructionBeat | null): void;
  finale(): void;
  lightning(): void;
  setReducedMotion(reduced: boolean): void;
  reset(): void;
  destroy(): void;
}

export interface StudySceneOptions {
  reduced: boolean;
  /** Element whose pointer moves drive the torch and the camera pan. Defaults to the host. */
  pointerTarget?: HTMLElement;
  /** Called when lightning strikes, with 0..1 strength, so the page can roll thunder after it. */
  onLightning?: (strength: number) => void;
  /** Called after every painted frame with the design-to-CSS-pixel transform of the camera. */
  onCamera?: (transform: StageTransform) => void;
}

const TAU = Math.PI * 2;

// Palette: Cinematic Brown Noir. No blue, cyan, or purple.
const C = {
  ink: 0x0b0806,
  ink2: 0x120c09,
  walnut: 0x2a1c13,
  espresso: 0x1d140d,
  leather: 0x65432d,
  brass: 0xa77a48,
  gold: 0xd9b681,
  paper: 0xe9decb,
  paperDim: 0xbfb19a,
  burgundy: 0x64352f,
  wine: 0x3d1d1b,
  rose: 0xd99a88,
  ember: 0xe0893f,
  flame: 0xffc06a,
  hall: 0xf0c890,
  ivory: 0xe2d3b5,
} as const;

// Deterministic room: the same seed gives the same books and planks on every load.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  draw(ctx);
  return Texture.from(canvas);
}

function hex(color: number, alpha = 1): string {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A soft white disc. Sprites tint it, so one texture serves every light.
function glowTexture(): Texture {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

// A light cone that fades from its top edge down: a trapezoid drawn on a canvas.
function coneTexture(): Texture {
  return canvasTexture(256, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(104, 0);
    ctx.lineTo(152, 0);
    ctx.lineTo(256, 512);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.fill();
  });
}

function makeGlow(tex: Texture, x: number, y: number, w: number, h: number, color: number, alpha: number): Sprite {
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  s.position.set(x, y);
  s.width = w;
  s.height = h;
  s.tint = color;
  s.alpha = alpha;
  s.blendMode = "add";
  return s;
}

function makeCone(tex: Texture, x: number, top: number, w: number, h: number, color: number, alpha: number): Sprite {
  const s = new Sprite(tex);
  s.anchor.set(0.5, 0);
  s.position.set(x, top);
  s.width = w;
  s.height = h;
  s.tint = color;
  s.alpha = alpha;
  s.blendMode = "add";
  return s;
}

// ---------------------------------------------------------------------------------------------------------------
// Room

interface Room {
  rain: TilingSprite;
  rainNear: TilingSprite;
  windowFlash: Graphics;
  drops: { g: Graphics; x: number; y: number; speed: number; len: number }[];
  flames: { g: Graphics; phase: number }[];
  fireGlow: Sprite;
  fireFloor: Sprite;
  candles: { flame: Graphics; glow: Sprite; phase: number }[];
  lampGlow: Sprite;
  lampCone: Sprite;
  sconce: Sprite;
  windowShaft: Sprite;
  minuteHand: Graphics;
  hourHand: Graphics;
  placeGlows: Record<"window" | "hallDesk" | "box" | "clock" | "note", Sprite>;
}

function drawWall(layer: Container): void {
  const wall = new Sprite(
    canvasTexture(400, 225, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 225);
      g.addColorStop(0, hex(0x1f150e));
      g.addColorStop(0.45, hex(0x2c1e14));
      g.addColorStop(1, hex(0x1e140d));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 400, 225);
      // Wallpaper stripes, barely there.
      for (let x = 0; x < 400; x += 7) {
        ctx.fillStyle = x % 14 === 0 ? "rgba(233,222,203,0.025)" : "rgba(0,0,0,0.05)";
        ctx.fillRect(x, 0, 3, 225);
      }
    }),
  );
  wall.position.set(-40, 0);
  wall.width = DESIGN_W + 80;
  wall.height = 660;
  layer.addChild(wall);

  const trim = new Graphics();
  trim.rect(-40, 0, DESIGN_W + 80, 34).fill(0x150e09);
  trim.rect(-40, 34, DESIGN_W + 80, 2).fill({ color: C.brass, alpha: 0.35 });
  trim.rect(-40, 38, DESIGN_W + 80, 1).fill({ color: C.leather, alpha: 0.5 });
  trim.rect(-40, 470, DESIGN_W + 80, 170).fill(0x170f0a);
  trim.rect(-40, 464, DESIGN_W + 80, 12).fill(0x2a1c13);
  trim.rect(-40, 464, DESIGN_W + 80, 1.5).fill({ color: C.brass, alpha: 0.35 });
  for (let x = -20; x < DESIGN_W + 40; x += 172) {
    trim.roundRect(x + 14, 494, 144, 116, 3).stroke({ width: 2, color: 0x3a2818, alpha: 0.9 });
    trim.roundRect(x + 18, 498, 136, 108, 2).stroke({ width: 1, color: C.leather, alpha: 0.22 });
  }
  trim.rect(-40, 626, DESIGN_W + 80, 14).fill(0x0e0906);
  layer.addChild(trim);
}

function drawFloor(layer: Container, rand: () => number): void {
  const floor = new Sprite(
    canvasTexture(400, 130, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 130);
      g.addColorStop(0, hex(0x1f150d));
      g.addColorStop(1, hex(0x0c0806));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 400, 130);
    }),
  );
  floor.position.set(-40, 640);
  floor.width = DESIGN_W + 80;
  floor.height = 270;
  layer.addChild(floor);

  const planks = new Graphics();
  let y = 646;
  let step = 9;
  while (y < DESIGN_H + 10) {
    planks.moveTo(-40, y).lineTo(DESIGN_W + 40, y).stroke({ width: 1, color: 0x2c1d13, alpha: 0.55 });
    let x = -40 + rand() * 140;
    while (x < DESIGN_W + 40) {
      planks.moveTo(x, y).lineTo(x, y + step).stroke({ width: 1, color: 0x2c1d13, alpha: 0.4 });
      x += 120 + rand() * 160;
    }
    y += step;
    step *= 1.16;
  }
  layer.addChild(planks);

  const rug = new Graphics();
  rug.poly([560, 704, 1150, 704, 1236, 884, 470, 884]).fill(0x341716);
  rug.poly([572, 710, 1138, 710, 1218, 876, 488, 876]).stroke({ width: 3, color: C.brass, alpha: 0.28 });
  rug.poly([596, 722, 1114, 722, 1184, 862, 524, 862]).stroke({ width: 1.5, color: C.rose, alpha: 0.12 });
  rug.ellipse(855, 792, 170, 40).stroke({ width: 1.5, color: C.brass, alpha: 0.14 });
  layer.addChild(rug);
}

function drawWindow(layer: Container, tex: { glow: Texture }, rand: () => number): Pick<
  Room,
  "rain" | "rainNear" | "windowFlash" | "drops"
> {
  const cx = 200;
  const paneShape = (g: Graphics): Graphics =>
    g.moveTo(96, 578).lineTo(96, 180).arc(cx, 180, 104, Math.PI, 0).lineTo(304, 578).closePath();

  const glass = new Container();
  const sky = new Sprite(
    canvasTexture(64, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, hex(0x090706));
      g.addColorStop(0.55, hex(0x1a120d));
      g.addColorStop(1, hex(0x3b2818));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 256);
    }),
  );
  sky.position.set(90, 70);
  sky.width = 220;
  sky.height = 515;
  glass.addChild(sky);

  const trees = new Graphics();
  trees.moveTo(90, 585);
  for (let x = 90; x <= 312; x += 14) trees.lineTo(x, 470 + rand() * 60);
  trees.lineTo(312, 585).closePath().fill(0x070504);
  glass.addChild(trees);
  glass.addChild(makeGlow(tex.glow, 230, 560, 220, 80, C.ember, 0.12));

  const streak = canvasTexture(64, 128, (ctx) => {
    const r = rng(7);
    for (let i = 0; i < 26; i += 1) {
      const x = r() * 64;
      const y = r() * 128;
      const len = 10 + r() * 24;
      ctx.strokeStyle = `rgba(233,222,203,${0.08 + r() * 0.22})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len * 0.18, y + len);
      ctx.stroke();
    }
  });
  const rain = new TilingSprite({ texture: streak, width: 230, height: 520 });
  rain.position.set(88, 66);
  rain.alpha = 0.8;
  glass.addChild(rain);
  const rainNear = new TilingSprite({ texture: streak, width: 230, height: 520 });
  rainNear.position.set(88, 66);
  rainNear.tileScale.set(1.8);
  rainNear.alpha = 0.45;
  glass.addChild(rainNear);

  const drops: Room["drops"] = [];
  for (let i = 0; i < 7; i += 1) {
    const g = new Graphics();
    glass.addChild(g);
    drops.push({ g, x: 104 + rand() * 192, y: 120 + rand() * 420, speed: 12 + rand() * 26, len: 14 + rand() * 22 });
  }
  const beads = new Graphics();
  for (let i = 0; i < 40; i += 1) {
    beads.circle(100 + rand() * 200, 90 + rand() * 480, 0.8 + rand() * 1.6).fill({ color: C.paper, alpha: 0.12 + rand() * 0.14 });
  }
  glass.addChild(beads);

  const windowFlash = paneShape(new Graphics()).fill(0xf3e6cf);
  windowFlash.alpha = 0;
  glass.addChild(windowFlash);

  const mask = paneShape(new Graphics()).fill(0xffffff);
  glass.addChild(mask);
  glass.mask = mask;
  layer.addChild(glass);

  const frame = new Graphics();
  frame.moveTo(82, 592).lineTo(82, 180).arc(cx, 180, 118, Math.PI, 0).lineTo(318, 592).stroke({ width: 14, color: 0x2a1c13 });
  frame
    .moveTo(82, 592)
    .lineTo(82, 180)
    .arc(cx, 180, 118, Math.PI, 0)
    .lineTo(318, 592)
    .stroke({ width: 1.5, color: C.brass, alpha: 0.3 });
  frame.rect(cx - 4, 76, 8, 504).fill(0x241710);
  frame.rect(96, 376, 208, 8).fill(0x241710);
  frame.rect(96, 250, 208, 6).fill(0x241710);
  // The latch on the centre mullion, with its muddy thumbprint and the chalk mark.
  frame.roundRect(cx - 9, 410, 18, 16, 3).fill(0x3a2818);
  frame.roundRect(cx - 9, 410, 18, 16, 3).stroke({ width: 1.5, color: C.brass, alpha: 0.55 });
  frame.circle(cx + 3, 418, 2).fill({ color: C.gold, alpha: 0.6 });
  frame.ellipse(cx - 2, 417, 4, 3).fill({ color: 0x4a3322, alpha: 0.8 });
  frame.moveTo(cx + 14, 400).lineTo(cx + 30, 398).stroke({ width: 1.2, color: C.paperDim, alpha: 0.45 });
  frame.rect(74, 588, 252, 16).fill(0x2a1c13);
  frame.rect(74, 588, 252, 1.5).fill({ color: C.brass, alpha: 0.35 });
  layer.addChild(frame);

  // Curtains with soft folds. The window is latched, so they hang still.
  const curtains = new Graphics();
  const drape = (x0: number, x1: number): void => {
    curtains.rect(x0, 46, x1 - x0, 596).fill(C.wine);
    const folds = 6;
    for (let i = 0; i < folds; i += 1) {
      const fx = x0 + ((i + 0.5) * (x1 - x0)) / folds;
      curtains.rect(fx - 3, 46, 6, 596).fill({ color: 0x1c0d0c, alpha: 0.55 });
      curtains.rect(fx + 4, 46, 2, 596).fill({ color: C.burgundy, alpha: 0.5 });
    }
  };
  drape(36, 104);
  drape(296, 372);
  curtains.rect(26, 34, 356, 30).fill(0x2e1514);
  for (let x = 26; x < 382; x += 22) curtains.circle(x + 11, 64, 11).fill(0x2e1514);
  curtains.rect(26, 34, 356, 1.5).fill({ color: C.brass, alpha: 0.4 });
  layer.addChild(curtains);

  return { rain, rainNear, windowFlash, drops };
}

function drawBookcase(layer: Container, rand: () => number): void {
  const g = new Graphics();
  g.rect(462, 98, 300, 14).fill(0x2f1f14);
  g.rect(462, 98, 300, 1.5).fill({ color: C.brass, alpha: 0.35 });
  g.rect(470, 112, 284, 528).fill(0x150d09);
  g.rect(470, 112, 12, 528).fill(0x2a1a10);
  g.rect(742, 112, 12, 528).fill(0x2a1a10);
  const spines = [0x5b3a26, 0x6e2f2a, 0x3f2a1b, 0x7a5a35, 0x4a3324, 0x2f2218, 0x8a6a40, 0x55241f, 0x6b4a2c];
  const shelves = [192, 292, 392, 492, 592];
  for (const top of shelves) {
    let x = 486;
    while (x < 736) {
      const w = 7 + Math.floor(rand() * 11);
      const h = 54 + Math.floor(rand() * 32);
      if (rand() < 0.08) {
        x += 10 + rand() * 14;
        continue;
      }
      if (x + w > 738) break;
      const color = spines[Math.floor(rand() * spines.length)] ?? 0x4a3324;
      if (rand() < 0.06) {
        g.poly([x, top, x + w, top, x + w + 16, top - h + 4, x + 16 - w * 0.2, top - h]).fill(color);
        x += w + 18;
        continue;
      }
      g.rect(x, top - h, w, h).fill(color);
      g.rect(x, top - h + 8, w, 1.5).fill({ color: C.brass, alpha: 0.28 });
      g.rect(x, top - 12, w, 1).fill({ color: C.brass, alpha: 0.2 });
      g.rect(x + w - 1, top - h, 1, h).fill({ color: 0x000000, alpha: 0.35 });
      x += w + (rand() < 0.2 ? 2 : 0.5);
    }
    g.rect(476, top, 272, 9).fill(0x3a2516);
    g.rect(476, top, 272, 1.5).fill({ color: C.leather, alpha: 0.7 });
  }
  layer.addChild(g);
}

function drawPortrait(layer: Container, tex: { cone: Texture }): void {
  const g = new Graphics();
  g.rect(1092, 124, 176, 228).fill(0x120c08);
  g.rect(1092, 124, 176, 228).stroke({ width: 10, color: 0x6b4a2c });
  g.rect(1092, 124, 176, 228).stroke({ width: 2, color: C.brass, alpha: 0.6 });
  g.ellipse(1180, 205, 30, 38).fill({ color: 0x3a2818, alpha: 0.7 });
  g.moveTo(1120, 352).quadraticCurveTo(1130, 262, 1180, 252).quadraticCurveTo(1230, 262, 1240, 352).fill({
    color: 0x24170f,
    alpha: 0.9,
  });
  g.rect(1150, 112, 60, 5).fill(C.brass);
  layer.addChild(g);
  layer.addChild(makeCone(tex.cone, 1180, 116, 210, 150, C.gold, 0.08));
}

function drawFireplace(layer: Container, lights: Container, tex: { glow: Texture }): Pick<
  Room,
  "flames" | "fireGlow" | "fireFloor" | "candles" | "minuteHand" | "hourHand"
> & { clockGlow: Sprite } {
  const g = new Graphics();
  g.rect(1040, 430, 280, 210).fill(0x2b1e15);
  for (const px of [1052, 1284]) {
    g.rect(px, 440, 24, 196).fill(0x33241a);
    for (let i = 0; i < 3; i += 1) g.rect(px + 4 + i * 7, 446, 2, 184).fill({ color: 0x000000, alpha: 0.35 });
  }
  g.roundRect(1108, 494, 144, 150, 18).fill(0x060403);
  g.roundRect(1108, 494, 144, 150, 18).stroke({ width: 3, color: 0x3a2818 });
  g.rect(1018, 412, 324, 20).fill(0x3a2516);
  g.rect(1018, 412, 324, 2).fill({ color: C.brass, alpha: 0.45 });
  g.rect(1026, 432, 308, 6).fill({ color: 0x000000, alpha: 0.4 });
  g.roundRect(1126, 612, 108, 14, 7).fill(0x1d1009);
  g.roundRect(1138, 600, 86, 13, 6).fill(0x24140c);
  g.rect(1118, 626, 124, 4).fill(0x2a1c13);
  layer.addChild(g);

  const flames: Room["flames"] = [];
  const shapes: [number, number, number, number][] = [
    [1150, 606, 16, 52],
    [1172, 604, 20, 70],
    [1196, 606, 18, 60],
    [1216, 607, 14, 44],
    [1184, 606, 10, 36],
  ];
  shapes.forEach(([x, base, w, h], i) => {
    const fl = new Graphics()
      .moveTo(-w / 2, 0)
      .bezierCurveTo(-w / 2, -h * 0.45, -w * 0.15, -h * 0.7, 0, -h)
      .bezierCurveTo(w * 0.2, -h * 0.65, w / 2, -h * 0.45, w / 2, 0)
      .closePath()
      .fill({ color: i % 2 === 0 ? C.ember : C.flame, alpha: 0.75 });
    fl.position.set(x, base);
    fl.blendMode = "add";
    layer.addChild(fl);
    flames.push({ g: fl, phase: i * 1.7 });
  });

  const fireGlow = makeGlow(tex.glow, 1180, 580, 420, 320, C.ember, 0.42);
  const fireFloor = makeGlow(tex.glow, 1170, 700, 760, 260, C.ember, 0.2);
  lights.addChild(fireGlow, fireFloor);

  const candles: Room["candles"] = [];
  for (const [x, phase] of [
    [1036, 0.3],
    [1326, 2.1],
  ] as const) {
    const stick = new Graphics();
    stick.rect(x - 6, 406, 12, 6).fill(C.brass);
    stick.rect(x - 2, 372, 4, 34).fill(C.brass);
    stick.rect(x - 4, 346, 8, 26).fill(0xd8c8a8);
    layer.addChild(stick);
    const flame = new Graphics().ellipse(0, -7, 3, 7).fill({ color: C.flame, alpha: 0.95 });
    flame.position.set(x, 345);
    flame.blendMode = "add";
    layer.addChild(flame);
    const glow = makeGlow(tex.glow, x, 338, 90, 90, C.flame, 0.35);
    lights.addChild(glow);
    candles.push({ flame, glow, phase });
  }

  // The manuscript box, open and empty, its lid raised.
  const box = new Graphics();
  box.rect(1062, 378, 66, 34).fill({ color: C.paper, alpha: 0.05 });
  box.rect(1066, 400, 58, 10).fill(0x4a2422);
  box.rect(1076, 401, 38, 6).fill({ color: C.paper, alpha: 0.12 });
  box.rect(1062, 378, 66, 34).stroke({ width: 1.5, color: C.gold, alpha: 0.5 });
  box.poly([1062, 378, 1128, 378, 1120, 350, 1054, 350]).fill({ color: C.paper, alpha: 0.06 });
  box.poly([1062, 378, 1128, 378, 1120, 350, 1054, 350]).stroke({ width: 1.5, color: C.gold, alpha: 0.45 });
  box.rect(1062, 410, 66, 3).fill(C.brass);
  layer.addChild(box);

  // The mantel clock, stopped at 20:52.
  const clock = new Graphics();
  const clockBody = (c: Graphics): Graphics =>
    c.moveTo(1218, 412).lineTo(1218, 352).arc(1250, 352, 32, Math.PI, 0).lineTo(1282, 412).closePath();
  clockBody(clock).fill(0x3a2516);
  clockBody(clock).stroke({ width: 1.5, color: C.brass, alpha: 0.5 });
  clock.circle(1250, 356, 22).fill({ color: C.paper, alpha: 0.86 });
  clock.circle(1250, 356, 22).stroke({ width: 2, color: C.brass });
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU;
    clock
      .moveTo(1250 + Math.sin(a) * 17, 356 - Math.cos(a) * 17)
      .lineTo(1250 + Math.sin(a) * 20, 356 - Math.cos(a) * 20)
      .stroke({ width: i % 3 === 0 ? 2 : 1, color: 0x211811 });
  }
  clock.roundRect(1240, 384, 20, 24, 3).fill({ color: 0x120c08 });
  clock.moveTo(1250, 386).lineTo(1257, 401).stroke({ width: 1.2, color: C.brass });
  clock.circle(1257, 402, 4).fill(C.brass);
  layer.addChild(clock);
  const hourHand = new Graphics().moveTo(0, 2).lineTo(0, -11).stroke({ width: 2.5, color: 0x211811, cap: "round" });
  hourHand.position.set(1250, 356);
  const minuteHand = new Graphics().moveTo(0, 3).lineTo(0, -17).stroke({ width: 1.6, color: 0x211811, cap: "round" });
  minuteHand.position.set(1250, 356);
  layer.addChild(hourHand, minuteHand);
  const clockGlow = makeGlow(tex.glow, 1250, 360, 130, 150, C.gold, 0);
  lights.addChild(clockGlow);

  return { flames, fireGlow, fireFloor, candles, minuteHand, hourHand, clockGlow };
}

function drawDesk(layer: Container, lights: Container, tex: { glow: Texture; cone: Texture }): Pick<
  Room,
  "lampGlow" | "lampCone"
> {
  const g = new Graphics();
  g.rect(572, 718, 18, 44).fill(0x1c120b);
  g.rect(850, 718, 18, 44).fill(0x1c120b);
  g.rect(568, 612, 304, 108).fill(0x24170f);
  g.rect(568, 612, 304, 108).stroke({ width: 1, color: 0x3a2818 });
  for (const [x, w] of [
    [582, 120],
    [738, 120],
  ] as const) {
    g.roundRect(x, 630, w, 34, 2).stroke({ width: 1.5, color: 0x3a2818 });
    g.ellipse(x + w / 2, 647, 8, 2.5).fill({ color: C.brass, alpha: 0.6 });
  }
  g.roundRect(582, 674, 276, 36, 2).stroke({ width: 1.5, color: 0x3a2818 });
  g.rect(556, 598, 328, 16).fill(0x3a2516);
  g.rect(556, 598, 328, 2).fill({ color: C.leather });
  // Blotter, inkwell, and loose papers.
  g.rect(690, 592, 120, 7).fill(0x3d1d1b);
  g.roundRect(842, 584, 14, 14, 3).fill(0x0c0806);
  g.poly([694, 595, 724, 593, 726, 597, 696, 599]).fill({ color: C.paper, alpha: 0.4 });
  // Banker's lamp
  g.ellipse(650, 598, 24, 5).fill(C.brass);
  g.rect(647, 556, 6, 42).fill(C.brass);
  g.poly([618, 536, 682, 536, 694, 560, 606, 560]).fill(0xa86f2c);
  g.poly([618, 536, 682, 536, 694, 560, 606, 560]).stroke({ width: 1.5, color: C.gold, alpha: 0.7 });
  g.rect(606, 558, 88, 3).fill({ color: C.flame, alpha: 0.9 });
  layer.addChild(g);

  const lampCone = makeCone(tex.cone, 650, 556, 230, 64, C.flame, 0.35);
  const lampPool = makeGlow(tex.glow, 690, 604, 320, 46, C.flame, 0.35);
  const lampGlow = makeGlow(tex.glow, 650, 560, 640, 460, C.gold, 0.2);
  lights.addChild(lampGlow, lampCone, lampPool);
  return { lampGlow, lampCone };
}

function drawDoorway(layer: Container, lights: Container, tex: { glow: Texture; cone: Texture }): Pick<Room, "sconce"> {
  const g = new Graphics();
  const hall = new Sprite(
    canvasTexture(64, 256, (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, hex(0x3a2818));
      grad.addColorStop(0.5, hex(0x5c3f27));
      grad.addColorStop(0.76, hex(0x4a3322));
      grad.addColorStop(1, hex(0x2a1c13));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 256);
    }),
  );
  hall.position.set(1400, 150);
  hall.width = 180;
  hall.height = 490;
  layer.addChild(hall);
  g.rect(1400, 470, 180, 6).fill({ color: 0x2a1c13, alpha: 0.8 });
  g.rect(1400, 586, 180, 54).fill({ color: 0x3a2818, alpha: 0.9 });
  // Hall desk with the register, inkstand, and guest book.
  g.rect(1458, 528, 120, 8).fill(0x2a1a10);
  g.rect(1466, 536, 104, 52).fill(0x23160e);
  g.rect(1470, 588, 8, 22).fill(0x1c120b);
  g.rect(1560, 588, 8, 22).fill(0x1c120b);
  g.poly([1470, 527, 1492, 523, 1514, 527, 1514, 531, 1470, 531]).fill({ color: C.paper, alpha: 0.85 });
  g.moveTo(1492, 523).lineTo(1492, 531).stroke({ width: 1, color: 0x6b4a2c });
  g.roundRect(1520, 518, 10, 10, 2).fill(0x0c0806);
  g.moveTo(1526, 518).lineTo(1534, 504).stroke({ width: 2, color: C.burgundy });
  g.rect(1536, 522, 34, 7).fill({ color: 0x6e2f2a });
  g.rect(1536, 522, 34, 2).fill({ color: C.paper, alpha: 0.6 });
  g.rect(1494, 286, 12, 20).fill(C.brass);
  g.ellipse(1500, 282, 10, 6).fill({ color: C.hall, alpha: 0.9 });
  g.rect(1386, 128, 210, 22).fill(0x2a1c13);
  g.rect(1386, 150, 14, 490).fill(0x2a1c13);
  g.rect(1580, 150, 14, 490).fill(0x2a1c13);
  g.rect(1386, 150, 210, 1.5).fill({ color: C.brass, alpha: 0.3 });
  g.rect(1400, 150, 1.5, 490).fill({ color: C.brass, alpha: 0.25 });
  g.poly([1540, 156, 1578, 150, 1578, 640, 1540, 624]).fill(0x1f140c);
  g.poly([1540, 156, 1578, 150, 1578, 640, 1540, 624]).stroke({ width: 1, color: 0x3a2818 });
  layer.addChild(g);

  const sconce = makeGlow(tex.glow, 1500, 300, 260, 300, C.hall, 0.5);
  lights.addChild(sconce, makeCone(tex.cone, 1490, 610, 520, 300, C.hall, 0.12));
  return { sconce };
}

// Portable search objects, each its own container so it can leave the room when found.
function drawPortables(back: Container, mid: Container): Partial<Record<FindId, Container>> {
  const items: Partial<Record<FindId, Container>> = {};

  const note = new Container();
  note.addChild(
    new Graphics()
      .poly([772, 590, 806, 586, 809, 596, 775, 600])
      .fill({ color: C.paper, alpha: 0.92 })
      .moveTo(790, 588)
      .lineTo(792, 598)
      .stroke({ width: 1, color: 0x8a6a40, alpha: 0.6 })
      .moveTo(778, 594)
      .lineTo(788, 593)
      .stroke({ width: 1, color: C.burgundy, alpha: 0.7 }),
  );
  mid.addChild(note);
  items.NOTE = note;

  const teacup = new Container();
  teacup.addChild(
    new Graphics()
      .ellipse(736, 591, 20, 4)
      .fill({ color: C.paper, alpha: 0.8 })
      .moveTo(723, 574)
      .lineTo(749, 574)
      .lineTo(745, 588)
      .lineTo(727, 588)
      .closePath()
      .fill({ color: C.paper, alpha: 0.88 })
      .rect(724, 578, 24, 2)
      .fill({ color: 0x8a6a40, alpha: 0.8 })
      .ellipse(736, 575, 12, 2)
      .fill(0x5a3d24)
      // PixiJS v8 resumes a path after fill() from a shared scratch point, so an arc needs its own moveTo
      // or it draws a stray line across the room from wherever that point was left.
      .moveTo(752 + 5 * Math.cos(-1.4), 580 + 5 * Math.sin(-1.4))
      .arc(752, 580, 5, -1.4, 1.4)
      .stroke({ width: 2, color: C.paper, alpha: 0.85 }),
  );
  mid.addChild(teacup);
  items.TEACUP = teacup;

  const quill = new Container();
  quill.addChild(
    new Graphics()
      .moveTo(850, 588)
      .lineTo(868, 540)
      .stroke({ width: 1.4, color: C.paperDim, alpha: 0.9 })
      .moveTo(866, 546)
      .quadraticCurveTo(880, 552, 874, 568)
      .quadraticCurveTo(866, 560, 858, 566)
      .quadraticCurveTo(858, 552, 866, 546)
      .closePath()
      .fill({ color: 0xd8c8a8, alpha: 0.85 }),
  );
  mid.addChild(quill);
  items.QUILL = quill;

  const umbrella = new Container();
  umbrella.position.set(548, 766);
  umbrella.rotation = -0.13;
  umbrella.addChild(
    new Graphics()
      .poly([0, 0, 8, -24, 9, -108, -9, -108, -8, -24])
      .fill(0x3d1d1b)
      .moveTo(-3, -104)
      .lineTo(-2, -26)
      .stroke({ width: 1, color: C.burgundy, alpha: 0.8 })
      .moveTo(4, -104)
      .lineTo(3, -26)
      .stroke({ width: 1, color: 0x1c0d0c, alpha: 0.8 })
      .rect(-1.5, -128, 3, 20)
      .fill(C.brass)
      .moveTo(0, -128)
      .quadraticCurveTo(0, -146, 12, -146)
      .quadraticCurveTo(22, -146, 22, -136)
      .stroke({ width: 4, color: 0x2a1a10, cap: "round" })
      .circle(1, 4, 2)
      .fill({ color: C.paper, alpha: 0.4 }),
  );
  mid.addChild(umbrella);
  items.UMBRELLA = umbrella;

  const gloves = new Container();
  const glove = (x: number, y: number, rot: number): Graphics => {
    const gl = new Graphics()
      .roundRect(-16, -9, 26, 18, 6)
      .fill(0x4b3220)
      .roundRect(8, -9, 13, 4, 2)
      .fill(0x4b3220)
      .roundRect(8, -4, 15, 4, 2)
      .fill(0x4b3220)
      .roundRect(8, 1, 14, 4, 2)
      .fill(0x4b3220)
      .roundRect(6, 6, 11, 4, 2)
      .fill(0x4b3220)
      .roundRect(-4, -15, 11, 5, 2)
      .fill(0x4b3220)
      .rect(-24, -8, 9, 16)
      .fill(0x3a2516)
      .ellipse(-4, 1, 7, 4)
      .fill({ color: 0x6b5236, alpha: 0.7 })
      .roundRect(-16, -9, 26, 18, 6)
      .stroke({ width: 1, color: C.gold, alpha: 0.18 });
    gl.position.set(x, y);
    gl.rotation = rot;
    return gl;
  };
  gloves.addChild(glove(356, 780, -0.25), glove(390, 772, 0.4));
  mid.addChild(gloves);
  items.GLOVES = gloves;

  const knight = new Container();
  knight.addChild(
    new Graphics()
      .rect(623, 288, 18, 4)
      .fill(C.ivory)
      .poly([625, 288, 626, 278, 623, 272, 629, 263, 637, 265, 640, 272, 635, 274, 638, 288])
      .fill(C.ivory)
      .circle(632, 268, 1)
      .fill(0x3a2818),
  );
  back.addChild(knight);
  items.KNIGHT = knight;

  const magnifier = new Container();
  magnifier.addChild(
    new Graphics()
      .moveTo(268, 586)
      .lineTo(290, 589)
      .stroke({ width: 4, color: 0x2a1a10, cap: "round" })
      .ellipse(256, 585, 12, 5)
      .fill({ color: C.paper, alpha: 0.18 })
      .ellipse(256, 585, 12, 5)
      .stroke({ width: 2.5, color: C.brass }),
  );
  back.addChild(magnifier);
  items.MAGNIFIER = magnifier;

  return items;
}

// ---------------------------------------------------------------------------------------------------------------
// Cast

interface Figure {
  root: Container;
  body: Container;
  head: Container;
  rim: Container;
  spot: Sprite;
  baseX: number;
  baseY: number;
  breath: number;
  sway: number;
  look: SuspectLook;
  glints: Graphics[];
}

function figureShell(x: number, y: number, scale: number, facing: 1 | -1): Figure {
  const root = new Container();
  root.position.set(x, y);
  root.scale.set(scale * facing, scale);
  const body = new Container();
  const head = new Container();
  const rim = new Container();
  root.addChild(body, head, rim);
  return {
    root,
    body,
    head,
    rim,
    spot: new Sprite(Texture.WHITE),
    baseX: x,
    baseY: y,
    breath: 4 + Math.random() * 2,
    sway: 6 + Math.random() * 3,
    look: "neutral",
    glints: [],
  };
}

function rimStroke(g: Graphics, alpha: number, width = 2): Graphics {
  return g.stroke({ width, color: C.gold, alpha, join: "round", cap: "round" });
}

// Small facial features stay legible at room scale; hats, poses and clue hitboxes keep their original geometry.
function faceFeatures(head: Container, centerY: number, width: number): void {
  head.addChild(new Graphics()
    .moveTo(-width * .55, centerY - 3).lineTo(-width * .15, centerY - 4)
    .moveTo(width * .15, centerY - 4).lineTo(width * .55, centerY - 3)
    .stroke({ width: 1.5, color: 0x4a3022, alpha: .9 })
    .circle(-width * .34, centerY, 1.4).circle(width * .34, centerY, 1.4).fill(0x241b15)
    .moveTo(0, centerY + 1).lineTo(-1, centerY + 6).lineTo(2, centerY + 6)
    .stroke({ width: 1.1, color: 0x8b6045 })
    .moveTo(-4, centerY + 11).quadraticCurveTo(0, centerY + 13, 4, centerY + 11)
    .stroke({ width: 1.2, color: 0x69402f })
    .ellipse(width * .6, centerY + 3, 1.6, 6).fill({ color: 0xf2c995, alpha: .55 }));
}

function buildGardener(): Figure {
  const f = figureShell(432, 708, 1, 1);
  const legs = new Graphics()
    .poly([-26, -142, -6, -142, -8, -24, -30, -24])
    .fill(C.ink)
    .poly([6, -142, 26, -142, 30, -24, 8, -24])
    .fill(C.ink)
    .roundRect(-36, -28, 30, 28, 6)
    .fill(C.ink2)
    .roundRect(6, -28, 32, 28, 6)
    .fill(C.ink2);
  const coat = new Graphics()
    .moveTo(-50, -262)
    .quadraticCurveTo(-60, -230, -58, -190)
    .lineTo(-62, -126)
    .lineTo(62, -126)
    .lineTo(58, -190)
    .quadraticCurveTo(60, -230, 50, -262)
    .quadraticCurveTo(0, -282, -50, -262)
    .closePath()
    .fill(0x554534);
  const arm = new Graphics()
    .moveTo(44, -250)
    .quadraticCurveTo(66, -210, 60, -168)
    .lineTo(48, -168)
    .quadraticCurveTo(52, -208, 34, -244)
    .closePath()
    .fill(0x483a2b);
  const lantern = new Graphics()
    .moveTo(48, -168)
    .quadraticCurveTo(56, -184, 64, -168)
    .stroke({ width: 2, color: 0x241710 })
    .rect(44, -166, 24, 30)
    .fill(0x1b120b)
    .rect(48, -162, 16, 22)
    .fill({ color: C.flame, alpha: 0.85 })
    .rect(44, -136, 24, 4)
    .fill(0x241710);
  f.body.addChild(legs, coat, arm, lantern);
  f.head.addChild(
    new Graphics()
      .circle(0, -286, 21)
      .fill(0xb08b61)
      .ellipse(0, -298, 48, 8)
      .fill(C.ink)
      .moveTo(-23, -298)
      .quadraticCurveTo(-22, -326, 0, -327)
      .quadraticCurveTo(22, -326, 23, -298)
      .closePath()
      .fill(C.ink),
  );
  f.body.addChild(new Graphics().moveTo(-20, -245).lineTo(0, -213).lineTo(20, -245).stroke({ width: 2, color: 0x9d7c55, alpha: .65 }).moveTo(0, -213).lineTo(0, -135).stroke({ width: 1.5, color: 0x20170f, alpha: .6 }).circle(6, -199, 2.3).circle(6, -175, 2.3).circle(6, -151, 2.3).fill(0xb58e55));
  faceFeatures(f.head, -284, 16);
  f.head.pivot.set(0, -270);
  f.head.position.set(0, -270);
  f.rim.addChild(rimStroke(new Graphics().moveTo(50, -262).quadraticCurveTo(60, -230, 58, -190).lineTo(62, -126), 0.4));
  f.rim.addChild(rimStroke(new Graphics().arc(0, -286, 21, -1.2, 0.9), 0.45, 1.6));
  f.rim.addChild(rimStroke(new Graphics().moveTo(0, -306).lineTo(48, -298), 0.3, 1.5));
  return f;
}

function buildGuest(): Figure {
  const f = figureShell(972, 728, 1, -1);
  const gown = new Graphics()
    .moveTo(-30, -268)
    .quadraticCurveTo(-36, -236, -22, -200)
    .quadraticCurveTo(-34, -110, -58, 0)
    .lineTo(56, 0)
    .quadraticCurveTo(32, -110, 22, -200)
    .quadraticCurveTo(36, -236, 30, -268)
    .quadraticCurveTo(0, -282, -30, -268)
    .closePath()
    .fill(0x643b35);
  const collar = new Graphics();
  for (let i = -3; i <= 3; i += 1) collar.circle(i * 9, -268 + Math.abs(i) * 2, 9).fill(C.ink);
  const arm = new Graphics()
    .moveTo(-22, -258)
    .quadraticCurveTo(-46, -220, -36, -206)
    .quadraticCurveTo(-26, -214, -22, -226)
    .closePath()
    .fill(0x57332e);
  const glass = new Graphics()
    .moveTo(-40, -238)
    .lineTo(-28, -238)
    .lineTo(-34, -226)
    .closePath()
    .fill({ color: C.paper, alpha: 0.18 })
    .moveTo(-34, -226)
    .lineTo(-34, -214)
    .stroke({ width: 1.2, color: C.paper, alpha: 0.3 })
    .moveTo(-38, -234)
    .lineTo(-30, -234)
    .stroke({ width: 2, color: C.burgundy, alpha: 0.9 });
  f.body.addChild(gown, collar, arm, glass);
  f.body.addChild(new Graphics().moveTo(-12, -250).lineTo(-5, -205).lineTo(-25, -50).stroke({ width: 2, color: 0xa0755b, alpha: .45 }).circle(0, -250, 4).fill(0xc7a16a));
  f.head.addChild(
    new Graphics()
      .ellipse(0, -294, 16, 19)
      .fill(0xd0a17b)
      .moveTo(-19, -298)
      .quadraticCurveTo(-18, -322, 0, -323)
      .quadraticCurveTo(19, -322, 20, -298)
      .lineTo(26, -296)
      .lineTo(-25, -296)
      .closePath()
      .fill(C.ink)
      .moveTo(12, -318)
      .quadraticCurveTo(34, -340, 46, -358)
      .quadraticCurveTo(36, -334, 16, -314)
      .closePath()
      .fill(C.ink),
  );
  faceFeatures(f.head, -292, 13);
  f.head.pivot.set(0, -276);
  f.head.position.set(0, -276);
  f.rim.addChild(
    rimStroke(
      new Graphics().moveTo(30, -268).quadraticCurveTo(36, -236, 22, -200).quadraticCurveTo(32, -110, 56, 0),
      0.5,
    ),
  );
  f.rim.addChild(rimStroke(new Graphics().arc(0, -294, 17, -1.0, 1.0), 0.5, 1.6));
  f.rim.addChild(rimStroke(new Graphics().moveTo(16, -314).quadraticCurveTo(36, -334, 46, -358), 0.35, 1.2));
  const glint = new Graphics().circle(-36, -236, 2.2).fill({ color: 0xffffff, alpha: 0.9 });
  glint.alpha = 0;
  f.body.addChild(glint);
  f.glints.push(glint);
  return f;
}

function buildClerk(): { figure: Figure; manuscript: Graphics } {
  const f = figureShell(1418, 668, 0.94, -1);
  const legs = new Graphics()
    .rect(-14, -46, 10, 42)
    .fill(C.ink)
    .rect(4, -46, 10, 42)
    .fill(C.ink)
    .roundRect(-18, -8, 16, 8, 3)
    .fill(C.ink2)
    .roundRect(2, -8, 16, 8, 3)
    .fill(C.ink2);
  const coat = new Graphics()
    .moveTo(-30, -258)
    .quadraticCurveTo(-38, -236, -36, -200)
    .lineTo(-40, -42)
    .lineTo(40, -42)
    .lineTo(36, -200)
    .quadraticCurveTo(38, -236, 30, -258)
    .quadraticCurveTo(0, -272, -30, -258)
    .closePath()
    .fill(0x594636);
  const collar = new Graphics().poly([-14, -262, 14, -262, 10, -276, -10, -276]).fill(C.ink);
  const manuscript = new Graphics()
    .rect(-14, -212, 30, 40)
    .fill({ color: C.paper, alpha: 0.95 })
    .rect(-10, -204, 22, 1.5)
    .fill({ color: 0x5a3d24, alpha: 0.7 })
    .rect(-10, -196, 18, 1.5)
    .fill({ color: 0x5a3d24, alpha: 0.7 })
    .rect(-10, -188, 20, 1.5)
    .fill({ color: 0x5a3d24, alpha: 0.7 })
    .rect(-14, -212, 30, 40)
    .stroke({ width: 1.5, color: C.gold, alpha: 0.8 });
  manuscript.alpha = 0;
  const keys = new Graphics()
    .circle(-30, -146, 7)
    .stroke({ width: 1.8, color: C.brass })
    .rect(-34, -140, 2, 12)
    .fill(C.brass)
    .rect(-28, -140, 2, 9)
    .fill(C.brass);
  const arm = new Graphics()
    .moveTo(-28, -250)
    .quadraticCurveTo(-40, -200, -32, -152)
    .lineTo(-24, -152)
    .quadraticCurveTo(-30, -200, -20, -246)
    .closePath()
    .fill(0x463728);
  f.body.addChild(legs, coat, collar, manuscript, arm, keys);
  f.head.addChild(
    new Graphics()
      .ellipse(0, -286, 15, 18)
      .fill(0xc29a72)
      .circle(10, -298, 9)
      .fill(C.ink)
      .moveTo(-15, -290)
      .quadraticCurveTo(-12, -308, 4, -306)
      .lineTo(12, -300)
      .lineTo(-4, -296)
      .closePath()
      .fill(C.ink),
  );
  f.body.addChild(new Graphics().moveTo(-20, -245).lineTo(0, -213).lineTo(20, -245).stroke({ width: 2, color: 0x9d7c55, alpha: .65 }).moveTo(0, -213).lineTo(0, -135).stroke({ width: 1.5, color: 0x20170f, alpha: .6 }).circle(6, -199, 2.3).circle(6, -175, 2.3).circle(6, -151, 2.3).fill(0xb58e55));
  faceFeatures(f.head, -284, 12);
  f.head.pivot.set(0, -268);
  f.head.position.set(0, -268);
  f.rim.addChild(rimStroke(new Graphics().moveTo(-30, -258).quadraticCurveTo(-38, -236, -36, -200).lineTo(-40, -42), 0.75, 2.4));
  f.rim.addChild(rimStroke(new Graphics().arc(0, -286, 16, Math.PI - 1.1, Math.PI + 1.2), 0.7, 2));
  f.rim.addChild(rimStroke(new Graphics().arc(10, -298, 10, Math.PI * 1.1, Math.PI * 1.7), 0.55, 1.6));
  const specs = new Graphics()
    .circle(-11, -288, 3.2)
    .stroke({ width: 1, color: C.paper, alpha: 0.9 })
    .circle(-3, -288, 3.2)
    .stroke({ width: 1, color: C.paper, alpha: 0.9 });
  specs.alpha = 0;
  f.head.addChild(specs);
  const keyGlint = new Graphics().circle(-32, -150, 2).fill({ color: 0xffffff, alpha: 0.9 });
  keyGlint.alpha = 0;
  f.body.addChild(keyGlint);
  f.glints.push(specs, keyGlint);
  return { figure: f, manuscript };
}

interface Detective {
  root: Container;
  body: Container;
  head: Container;
  arm: Container;
  legL: Graphics;
  legR: Graphics;
  lensGlint: Graphics;
  x: number;
  targetX: number;
  facing: 1 | -1;
  walkPhase: number;
}

// The detective waits by the fireplace, clear of every object on the search list.
const DETECTIVE_HOME = 1290;
const DETECTIVE_FLOOR = 868;
const DETECTIVE_SCALE = 1;

function buildDetective(): Detective {
  const root = new Container();
  root.position.set(DETECTIVE_HOME, DETECTIVE_FLOOR);
  root.scale.set(-DETECTIVE_SCALE, DETECTIVE_SCALE);
  const body = new Container();
  const legL = new Graphics().poly([-30, -186, -8, -186, -12, -10, -34, -10]).fill(C.ink).roundRect(-40, -12, 30, 12, 5).fill(C.ink2);
  const legR = new Graphics().poly([8, -186, 30, -186, 34, -10, 12, -10]).fill(C.ink).roundRect(10, -12, 32, 12, 5).fill(C.ink2);
  legL.pivot.set(-20, -186);
  legL.position.set(-20, -186);
  legR.pivot.set(20, -186);
  legR.position.set(20, -186);
  const coat = new Graphics()
    .moveTo(-52, -318)
    .quadraticCurveTo(-60, -280, -46, -250)
    .lineTo(-42, -214)
    .lineTo(-62, -116)
    .lineTo(62, -116)
    .lineTo(42, -214)
    .lineTo(46, -250)
    .quadraticCurveTo(60, -280, 52, -318)
    .quadraticCurveTo(26, -340, 0, -340)
    .quadraticCurveTo(-26, -340, -52, -318)
    .closePath()
    .fill(0x4d3d2d);
  const collar = new Graphics().poly([-24, -336, 24, -336, 18, -352, -18, -352]).fill(C.ink);
  const sleeve = new Graphics()
    .moveTo(-50, -312)
    .quadraticCurveTo(-66, -250, -58, -196)
    .lineTo(-46, -196)
    .quadraticCurveTo(-52, -250, -38, -304)
    .closePath()
    .fill(0x3c3025);
  const belt = new Graphics().moveTo(-44, -216).lineTo(44, -216).stroke({ width: 1.5, color: C.gold, alpha: 0.18 });
  body.addChild(legL, legR, coat, collar, sleeve, belt);
  body.addChild(
    rimStroke(new Graphics().moveTo(52, -318).quadraticCurveTo(60, -280, 46, -250).lineTo(42, -214).lineTo(62, -116), 0.42, 2.2),
  );

  const head = new Container();
  head.addChild(
    new Graphics()
      .ellipse(0, -364, 21, 25)
      .fill(0xb78c64)
      .ellipse(0, -380, 46, 9)
      .fill(C.ink)
      .moveTo(-27, -382)
      .quadraticCurveTo(-26, -410, -10, -412)
      .lineTo(0, -404)
      .lineTo(10, -412)
      .quadraticCurveTo(26, -410, 27, -382)
      .closePath()
      .fill(C.ink),
  );
  head.addChild(rimStroke(new Graphics().arc(0, -364, 21, -0.9, 1.0), 0.45, 1.8));
  head.addChild(rimStroke(new Graphics().moveTo(0, -389).lineTo(46, -380), 0.35, 1.5));
  body.addChild(new Graphics().moveTo(-20, -300).lineTo(0, -268).lineTo(20, -300).stroke({ width: 2, color: 0x9d7c55, alpha: .65 }).moveTo(0, -268).lineTo(0, -190).stroke({ width: 1.5, color: 0x20170f, alpha: .6 }).circle(6, -254, 2.3).circle(6, -230, 2.3).circle(6, -206, 2.3).fill(0xb58e55));
  faceFeatures(head, -360, 17);
  head.pivot.set(0, -340);
  head.position.set(0, -340);

  const arm = new Container();
  arm.position.set(40, -312);
  arm.addChild(
    new Graphics()
      .moveTo(-10, 0)
      .quadraticCurveTo(-14, 60, -6, 112)
      .lineTo(8, 112)
      .quadraticCurveTo(12, 60, 12, 0)
      .closePath()
      .fill(C.ink),
    new Graphics().moveTo(1, 112).lineTo(2, 130).stroke({ width: 4, color: 0x2a1c13, cap: "round" }),
    new Graphics().circle(2, 145, 14).stroke({ width: 3, color: C.brass }),
    new Graphics().circle(2, 145, 12).fill({ color: C.paper, alpha: 0.08 }),
  );
  const lensGlint = new Graphics().circle(-3, 140, 3).fill({ color: 0xffffff, alpha: 0.95 });
  lensGlint.alpha = 0;
  arm.addChild(lensGlint);
  arm.rotation = 0.12;
  root.addChild(body, head, arm);
  return {
    root,
    body,
    head,
    arm,
    legL,
    legR,
    lensGlint,
    x: DETECTIVE_HOME,
    targetX: DETECTIVE_HOME,
    facing: -1,
    walkPhase: 0,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Threads and effects

function clueCentre(clueId: ClueId): { x: number; y: number } {
  const item = FIND_ITEMS.find((entry) => entry.clue === clueId);
  return item ? { x: item.box.x, y: item.box.y } : { x: DESIGN_W / 2, y: DESIGN_H / 2 };
}

function evidenceCentre(id: EvidenceId): { x: number; y: number } {
  return clueCentre(evidenceById(id).clue);
}

interface Thread {
  link: LinkId;
  g: Graphics;
  progress: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

function drawThread(t: Thread): void {
  const { g, from, to } = t;
  g.clear();
  if (t.progress <= 0) return;
  const cx = (from.x + to.x) / 2;
  const cy = Math.max(from.y, to.y) + 70;
  const steps = 32;
  const last = Math.max(1, Math.round(clamp(t.progress, 0, 1) * steps));
  g.moveTo(from.x, from.y);
  let tipX = from.x;
  let tipY = from.y;
  for (let i = 1; i <= last; i += 1) {
    const s = i / steps;
    const u = 1 - s;
    tipX = u * u * from.x + 2 * u * s * cx + s * s * to.x;
    tipY = u * u * from.y + 2 * u * s * cy + s * s * to.y;
    g.lineTo(tipX, tipY);
  }
  g.stroke({ width: 2, color: C.gold, alpha: 0.7, cap: "round", join: "round" });
  if (t.progress < 1) g.circle(tipX, tipY, 4).fill({ color: C.paper, alpha: 0.95 });
  g.circle(from.x, from.y, 3.5).fill({ color: C.burgundy });
  if (t.progress >= 1) g.circle(to.x, to.y, 3.5).fill({ color: C.burgundy });
}

interface Particle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  span: number;
  spin: number;
}

// ---------------------------------------------------------------------------------------------------------------

export async function createStudyScene(host: HTMLElement, options: StudySceneOptions): Promise<StudyScene> {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    width: Math.max(1, host.clientWidth),
    height: Math.max(1, host.clientHeight),
  });
  const canvas = app.canvas;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.pixiScene = "manuscript";
  canvas.dataset.frame = "0";
  app.ticker.maxFPS = window.matchMedia("(max-width: 760px)").matches ? 45 : 60;
  host.appendChild(canvas);
  app.stage.eventMode = "none";

  let reduced = options.reduced;
  const rand = rng(1931);
  const tex = { glow: glowTexture(), cone: coneTexture() };
  const portraitFrames = new Set<Texture>();
  let portraitAtlas: Texture | null = null;
  try { portraitAtlas = await Assets.load<Texture>(CAST_ATLAS); } catch { /* Existing vector faces remain usable if the shared atlas is unavailable. */ }
  function paintFace(head: Container, kind: Portrait, center: number, size = 1): void {
    if (!portraitAtlas) return;
    head.removeChildren().forEach(child => child.destroy({ children: true }));
    const [column, row] = CAST_CELLS[kind];
    const cell = portraitAtlas.width / 3;
    const texture = new Texture({ source: portraitAtlas.source, frame: new Rectangle(column * cell + cell * .17, row * cell + cell * .015, cell * .66, cell * .71) });
    portraitFrames.add(texture);
    const face = new Sprite(texture); face.anchor.set(.5); face.position.set(0, center); face.width = 68 * size; face.height = 74 * size;
    const mask = new Graphics().ellipse(0, center, 29 * size, 35 * size).fill(0xffffff);
    face.mask = mask; head.addChild(face, mask);
  }

  const world = new Container();
  app.stage.addChild(world);
  const camera = new Container();
  world.addChild(camera);
  const back = new Container();
  const lights = new Container();
  const mid = new Container();
  const cast = new Container();
  const marks = new Container();
  const fx = new Container();
  camera.addChild(back, lights, mid, cast, marks, fx);

  drawWall(back);
  const windowParts = drawWindow(back, tex, rand);
  drawBookcase(back, rand);
  drawPortrait(back, tex);
  const doorParts = drawDoorway(back, lights, tex);
  drawFloor(back, rand);
  const fireParts = drawFireplace(mid, lights, tex);
  const deskParts = drawDesk(mid, lights, tex);
  const portables = drawPortables(back, mid);
  const windowShaft = makeCone(tex.cone, 200, 330, 360, 620, C.paperDim, 0.05);
  lights.addChild(windowShaft);
  const placeGlows: Room["placeGlows"] = {
    window: makeGlow(tex.glow, 200, 400, 340, 420, C.gold, 0),
    hallDesk: makeGlow(tex.glow, 1515, 540, 240, 160, C.gold, 0),
    box: makeGlow(tex.glow, 1095, 386, 200, 150, C.gold, 0),
    clock: fireParts.clockGlow,
    note: makeGlow(tex.glow, 790, 594, 200, 110, C.gold, 0),
  };
  lights.addChild(placeGlows.window, placeGlows.hallDesk, placeGlows.box, placeGlows.note);
  const room: Room = { ...windowParts, ...fireParts, ...deskParts, ...doorParts, windowShaft, placeGlows };
  // A warm torch follows the pointer during the search. It helps a little; the room stays readable without it.
  const torch = makeGlow(tex.glow, -999, -999, 460, 460, C.flame, 0);
  lights.addChild(torch);

  const gardener = buildGardener();
  const guest = buildGuest();
  const clerkParts = buildClerk();
  const clerk = clerkParts.figure;
  const figures: Record<SuspectId, Figure> = { GARDENER: gardener, GUEST: guest, CLERK: clerk };
  for (const [id, fig] of Object.entries(figures) as [SuspectId, Figure][]) {
    fig.glints = fig.glints.filter(node => node.parent !== fig.head);
    paintFace(fig.head, MANUSCRIPT_PORTRAITS[id], -286);
    const spot = makeCone(tex.cone, fig.baseX, 60, 300, fig.baseY - 40, C.gold, 0);
    lights.addChild(spot);
    fig.spot = spot;
    cast.addChild(fig.root);
  }
  const lanternGlow = makeGlow(tex.glow, 432 + 56, 708 - 152, 170, 170, C.flame, 0.42);
  lights.addChild(lanternGlow);
  const ghostParts = buildClerk();
  const ghost = ghostParts.figure;
  paintFace(ghost.head, MANUSCRIPT_PORTRAITS.CLERK, -286);
  ghost.root.alpha = 0;
  ghost.root.visible = false;
  ghost.root.tint = C.gold;
  cast.addChild(ghost.root);
  const detective = buildDetective();
  paintFace(detective.head, "hat", -360, 1.15);
  canvas.dataset.portraitAtlas = portraitAtlas ? "shared-cast-v1" : "vector-fallback";
  cast.addChild(detective.root);

  const threadLayer = new Container();
  marks.addChild(threadLayer);
  const threads: Thread[] = [];
  // The hint ring: a magnifier outline that pulses over the object it points at.
  const hintRing = new Container();
  hintRing.addChild(
    new Graphics().circle(0, 0, 54).stroke({ width: 4, color: C.gold }),
    new Graphics().circle(0, 0, 62).stroke({ width: 1.5, color: C.paper, alpha: 0.6 }),
    new Graphics().moveTo(40, 40).lineTo(70, 70).stroke({ width: 7, color: C.gold, cap: "round" }),
    makeGlow(tex.glow, 0, 0, 220, 220, C.gold, 0.35),
  );
  hintRing.visible = false;
  marks.addChild(hintRing);
  let hintUntil = 0;
  const particles: Particle[] = [];
  const effectLayer = new Container();
  marks.addChild(effectLayer);

  const motes: { g: Graphics; x: number; y: number; speed: number; phase: number }[] = [];
  for (let i = 0; i < 46; i += 1) {
    const g = new Graphics().circle(0, 0, 0.8 + rand() * 1.8).fill({ color: C.paper });
    fx.addChild(g);
    motes.push({ g, x: rand() * DESIGN_W, y: 120 + rand() * 620, speed: 4 + rand() * 9, phase: rand() * TAU });
  }
  const embers: { g: Graphics; x: number; life: number; speed: number; drift: number }[] = [];
  for (let i = 0; i < 16; i += 1) {
    const g = new Graphics().circle(0, 0, 1.4).fill({ color: C.flame });
    g.blendMode = "add";
    fx.addChild(g);
    embers.push({ g, x: 1180, life: rand(), speed: 30 + rand() * 40, drift: rand() * 2 - 1 });
  }
  const hazeTex = canvasTexture(256, 128, (ctx) => {
    const g = ctx.createRadialGradient(128, 64, 0, 128, 64, 128);
    g.addColorStop(0, "rgba(233,222,203,0.5)");
    g.addColorStop(1, "rgba(233,222,203,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  });
  const hazes = [0, 1, 2].map((i) => {
    const s = new Sprite(hazeTex);
    s.anchor.set(0.5);
    s.width = 900;
    s.height = 360;
    s.alpha = 0.05 + i * 0.012;
    s.position.set(300 + i * 500, 420 + i * 90);
    fx.addChild(s);
    return { s, speed: 6 + i * 4, base: 300 + i * 500 };
  });

  const flash = new Graphics().rect(0, 0, DESIGN_W, DESIGN_H).fill(0xf3e6cf);
  flash.alpha = 0;
  flash.blendMode = "add";
  const dim = new Graphics().rect(0, 0, DESIGN_W, DESIGN_H).fill(0x050302);
  dim.alpha = 0;
  const wash = new Graphics().rect(0, 0, DESIGN_W, DESIGN_H).fill(C.burgundy);
  wash.alpha = 0;
  wash.blendMode = "add";
  const memory = new Graphics().rect(0, 0, DESIGN_W, DESIGN_H).fill(0x6b4a2c);
  memory.alpha = 0;
  memory.blendMode = "add";
  const vignette = new Sprite(
    canvasTexture(320, 180, (ctx) => {
      const g = ctx.createRadialGradient(160, 96, 40, 160, 90, 200);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.62, "rgba(0,0,0,0.2)");
      g.addColorStop(1, "rgba(0,0,0,0.74)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 320, 180);
    }),
  );
  vignette.width = DESIGN_W;
  vignette.height = DESIGN_H;
  const grain = new TilingSprite({
    texture: canvasTexture(128, 128, (ctx) => {
      const img = ctx.createImageData(128, 128);
      const r = rng(99);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 200 + Math.floor(r() * 55);
        img.data[i] = v;
        img.data[i + 1] = v - 10;
        img.data[i + 2] = v - 30;
        img.data[i + 3] = Math.floor(r() * 26);
      }
      ctx.putImageData(img, 0, 0);
    }),
    width: DESIGN_W,
    height: DESIGN_H,
  });
  grain.alpha = 0.5;
  world.addChild(dim, wash, memory, flash, vignette, grain);

  // ------------------------------------------------------------------------------------------------------------
  // State

  let phase: ScenePhase = "opening";
  let elapsed = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, cssX: 0, cssY: 0, inside: false };
  const cam = { zoom: 1.06, fx: DESIGN_W / 2, fy: DESIGN_H / 2, shake: 0 };
  const lastCam = { pivotX: DESIGN_W / 2, pivotY: DESIGN_H / 2, posX: DESIGN_W / 2, posY: DESIGN_H / 2, zoom: 1 };
  let flashLevel = 0;
  let nextLightning = 14 + Math.random() * 16;
  let pendingAim: ClueId | null = null;
  let armTween: gsap.core.Tween | null = null;
  const timelines: gsap.core.Animation[] = [];
  let clockSpin = 0;
  const clockBase = { hour: ((8 + 52 / 60) / 12) * TAU, minute: (52 / 60) * TAU };
  let visible = true;
  let frames = 0;
  const suspended = new Set<gsap.core.Animation>();
  const syncVisibility = (): void => {
    const playing = visible && !document.hidden && !reduced;
    canvas.dataset.running = String(playing);
    if (playing) { app.ticker.start(); for (const animation of suspended) animation.resume(); suspended.clear(); }
    else {
      app.ticker.stop();
      for (const animation of [...timelines, ...(armTween ? [armTween] : [])]) if (!animation.paused() && animation.totalProgress() < 1) { animation.pause(); suspended.add(animation); }
    }
  };

  const track = <T extends gsap.core.Animation>(anim: T): T => {
    timelines.push(anim);
    if (!visible || document.hidden) { anim.pause(); suspended.add(anim); }
    return anim;
  };
  const killAll = (): void => {
    for (const anim of timelines) anim.kill();
    timelines.length = 0;
    suspended.clear();
    armTween?.kill();
    armTween = null;
  };

  function spawnParticles(x: number, y: number, count: number, color: number, speed: number, span: number): void {
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU + Math.random() * 0.5;
      const g = new Graphics();
      if (color === C.gold) g.poly([0, -5, 1.4, -1.4, 5, 0, 1.4, 1.4, 0, 5, -1.4, 1.4, -5, 0, -1.4, -1.4]).fill(color);
      else g.circle(0, 0, 2).fill(color);
      g.blendMode = "add";
      effectLayer.addChild(g);
      const v = speed * (0.6 + Math.random() * 0.6);
      particles.push({ g, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, span, spin: Math.random() * 6 - 3 });
    }
  }

  // ------------------------------------------------------------------------------------------------------------
  // Frame

  const paint = (dt: number): void => {
    const t = reduced ? 0 : elapsed;
    const still = reduced;

    if (!still) {
      room.rain.tilePosition.x -= dt * 26;
      room.rain.tilePosition.y += dt * 420;
      room.rainNear.tilePosition.x -= dt * 40;
      room.rainNear.tilePosition.y += dt * 640;
    }
    for (const d of room.drops) {
      if (!still) {
        d.y += d.speed * dt * (0.6 + 0.4 * Math.sin(t * 1.3 + d.x));
        if (d.y > 590) {
          d.y = 110 + Math.random() * 120;
          d.x = 104 + Math.random() * 192;
        }
      }
      d.g.clear();
      d.g.moveTo(d.x, d.y - d.len).lineTo(d.x, d.y).stroke({ width: 1.2, color: C.paper, alpha: 0.22 });
      d.g.circle(d.x, d.y, 1.8).fill({ color: C.paper, alpha: 0.4 });
    }

    const n = (f: number, p: number): number => 0.5 + 0.25 * Math.sin(t * f + p) + 0.25 * Math.sin(t * f * 2.3 + p * 1.7);
    for (const fl of room.flames) {
      const k = still ? 1 : 0.82 + 0.36 * n(7.5, fl.phase);
      fl.g.scale.set(1 + (k - 1) * 0.3, k);
      fl.g.alpha = still ? 0.75 : 0.55 + 0.35 * n(9, fl.phase + 1);
    }
    const fire = still ? 1 : 0.86 + 0.2 * n(6, 0.4);
    room.fireGlow.alpha = 0.42 * fire;
    room.fireFloor.alpha = 0.2 * fire;
    for (const c of room.candles) {
      const k = still ? 1 : 0.9 + 0.16 * n(11, c.phase);
      c.flame.scale.set(1, k);
      c.glow.alpha = 0.32 * k;
    }
    const lampFlicker = still ? 1 : t % 9.3 > 9.15 ? 0.82 : 1;
    room.lampGlow.alpha = Math.max(room.lampGlow.alpha, 0) > 0.2 ? room.lampGlow.alpha : 0.2 * lampFlicker;
    room.lampCone.alpha = 0.35 * lampFlicker;
    room.sconce.alpha = still ? 0.5 : 0.47 + 0.05 * n(3, 2);
    lanternGlow.alpha = still ? 0.42 : 0.36 + 0.12 * n(8, 3);

    room.hourHand.rotation = clockBase.hour - clockSpin / 12;
    room.minuteHand.rotation = clockBase.minute - clockSpin;

    for (const fig of [...Object.values(figures), ghost]) {
      fig.body.scale.y = 1 + 0.009 * Math.sin((TAU * t) / fig.breath);
      fig.head.rotation = 0.04 * Math.sin((TAU * t) / fig.sway + fig.baseX);
      fig.root.rotation = 0.006 * Math.sin((TAU * t) / (fig.sway * 1.6));
    }
    for (const fig of Object.values(figures)) {
      fig.glints.forEach((gl, i) => {
        const cycle = (t + i * 2.7 + fig.baseX * 0.01) % 7.5;
        gl.alpha = still ? 0 : cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) : 0;
      });
    }

    // Detective: walk toward the target, aim the magnifier on arrival, and face the room at home.
    const dx = detective.targetX - detective.x;
    const walking = Math.abs(dx) > 1;
    if (walking && !still) {
      const stepLen = Math.min(Math.abs(dx), 470 * dt);
      detective.x += Math.sign(dx) * stepLen;
      detective.walkPhase += stepLen / 38;
      detective.facing = dx > 0 ? 1 : -1;
    } else if (walking) {
      detective.x = detective.targetX;
    }
    if (!walking && pendingAim === null && armTween === null && detective.x === DETECTIVE_HOME) detective.facing = -1;
    const bob = walking && !still ? Math.abs(Math.sin(detective.walkPhase)) * 6 : 0;
    detective.root.position.set(detective.x, DETECTIVE_FLOOR - bob);
    detective.root.scale.x = DETECTIVE_SCALE * detective.facing;
    detective.root.rotation = walking && !still ? 0.025 * detective.facing : 0;
    const swing = walking && !still ? Math.sin(detective.walkPhase) * 0.16 : 0;
    detective.legL.rotation = swing;
    detective.legR.rotation = -swing;
    detective.body.scale.y = 1 + 0.008 * Math.sin((TAU * t) / 4.6);
    if (!walking && pendingAim !== null) {
      const id = pendingAim;
      pendingAim = null;
      aimAt(id);
    }

    // Hint ring and effects.
    if (hintRing.visible) {
      const left = hintUntil - elapsed;
      if (!still && left <= 0) hintRing.visible = false;
      const k = still ? 1 : 1 + 0.08 * Math.sin(elapsed * 6);
      hintRing.scale.set(k);
      hintRing.alpha = still ? 1 : clamp(left / 0.6, 0, 1);
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      if (!p) continue;
      p.life += dt;
      p.vy += 90 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.g.position.set(p.x, p.y);
      p.g.rotation += p.spin * dt;
      p.g.alpha = clamp(1 - p.life / p.span, 0, 1);
      if (p.life >= p.span || still) {
        p.g.destroy();
        particles.splice(i, 1);
      }
    }
    for (const th of threads) drawThread(th);

    for (const m of motes) {
      const x = m.x + (still ? 0 : Math.sin(t * 0.21 + m.phase) * 30 + t * m.speed * 0.4);
      const y = m.y + (still ? 0 : Math.sin(t * 0.33 + m.phase * 2) * 18 - t * m.speed * 0.12);
      const wx = ((x % DESIGN_W) + DESIGN_W) % DESIGN_W;
      const wy = 110 + ((((y - 110) % 620) + 620) % 620);
      m.g.position.set(wx, wy);
      const nearLamp = Math.max(0, 1 - Math.hypot(wx - 650, wy - 560) / 320);
      const nearWin = Math.max(0, 1 - Math.hypot(wx - 220, wy - 520) / 300);
      m.g.alpha = (0.08 + 0.55 * Math.max(nearLamp, nearWin)) * (0.6 + 0.4 * Math.sin(t * 1.7 + m.phase));
    }
    for (const e of embers) {
      if (!still) {
        e.life += dt * (e.speed / 90);
        if (e.life > 1) {
          e.life = 0;
          e.x = 1150 + Math.random() * 60;
          e.drift = Math.random() * 2 - 1;
        }
      }
      const y = 600 - e.life * 150;
      e.g.position.set(e.x + Math.sin(e.life * 8) * 6 + e.drift * e.life * 30, y);
      e.g.alpha = still ? 0 : (1 - e.life) * 0.9 * (y > 430 ? 1 : 0);
    }
    for (const h of hazes) h.s.x = h.base + (still ? 0 : Math.sin(t * 0.05 * h.speed) * 160);
    if (!still) grain.tilePosition.set(Math.random() * 128, Math.random() * 128);

    if (!still && phase !== "opening") {
      nextLightning -= dt;
      if (nextLightning <= 0) {
        strike(0.6 + Math.random() * 0.4);
        nextLightning = 22 + Math.random() * 30;
      }
    }
    if (flashLevel > 0) flashLevel = Math.max(0, flashLevel - dt * 2.4);
    const flicker = flashLevel > 0 ? (Math.sin(elapsed * 60) > 0.2 ? 1 : 0.55) : 0;
    flash.alpha = 0.22 * flashLevel * flicker;
    room.windowFlash.alpha = 0.85 * flashLevel * flicker;
    room.windowShaft.alpha = 0.05 + 0.4 * flashLevel * flicker;

    // Camera: drift, pointer pan, and shake. The pivot is clamped so the room always covers the frame.
    pointer.sx = lerp(pointer.sx, still ? 0 : pointer.x, 0.06);
    pointer.sy = lerp(pointer.sy, still ? 0 : pointer.y, 0.06);
    const drift = still ? 0 : Math.sin(t * 0.07) * 6;
    const zoom = cam.zoom;
    const shakeX = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 18 : 0;
    const shakeY = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 10 : 0;
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 2.5);
    const halfW = DESIGN_W / (2 * zoom);
    const halfH = DESIGN_H / (2 * zoom);
    const pivotX = clamp(cam.fx + drift - pointer.sx * 10, halfW, DESIGN_W - halfW);
    const pivotY = clamp(cam.fy - pointer.sy * 6, halfH, DESIGN_H - halfH);
    const posX = DESIGN_W / 2 + shakeX;
    const posY = DESIGN_H / 2 + shakeY;
    camera.scale.set(zoom);
    camera.pivot.set(pivotX, pivotY);
    camera.position.set(posX, posY);
    cast.x = -pointer.sx * 4;
    Object.assign(lastCam, { pivotX, pivotY, posX, posY, zoom });

    // Torch: the pointer's design position under the current camera.
    if (phase === "investigating" && pointer.inside) {
      const s = world.scale.x || 1;
      const tx = pivotX + ((pointer.cssX - world.position.x) / s - posX) / zoom;
      const ty = pivotY + ((pointer.cssY - world.position.y) / s - posY) / zoom;
      torch.position.set(tx, ty);
      torch.alpha = still ? 0.14 : 0.12 + 0.03 * n(5, 1);
    } else {
      torch.alpha = 0;
    }

    const s = world.scale.x;
    options.onCamera?.({
      tx: world.position.x + s * (posX - pivotX * zoom),
      ty: world.position.y + s * (posY - pivotY * zoom),
      k: s * zoom,
    });
  };

  const render = (): void => {
    paint(0);
    app.render();
  };

  app.ticker.add((ticker) => {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    elapsed += dt;
    paint(dt);
    if (++frames % 12 === 0) canvas.dataset.frame = String(frames);
  });

  function strike(strength: number): void {
    if (reduced) return;
    flashLevel = Math.max(flashLevel, strength);
    options.onLightning?.(strength);
  }

  function aimAt(id: ClueId): void {
    const target = clueCentre(id);
    const facing: 1 | -1 = target.x >= detective.x ? 1 : -1;
    detective.facing = facing;
    const shoulderX = detective.x + 40 * DETECTIVE_SCALE * facing;
    const shoulderY = DETECTIVE_FLOOR - 312 * DETECTIVE_SCALE;
    const ax = (target.x - shoulderX) * facing;
    const ay = target.y - shoulderY;
    const angle = clamp(Math.atan2(ay, Math.max(20, ax)) - Math.PI / 2, -2.5, 0.2);
    armTween?.kill();
    if (reduced) {
      detective.arm.rotation = 0.12;
      return;
    }
    armTween = gsap.to(detective.arm, {
      rotation: angle,
      duration: 0.45,
      ease: "power2.out",
      onComplete: () => {
        gsap.fromTo(detective.lensGlint, { alpha: 1 }, { alpha: 0, duration: 0.6, ease: "power1.out" });
        armTween = gsap.to(detective.arm, {
          rotation: 0.12,
          duration: 0.6,
          delay: 1.2,
          ease: "power2.inOut",
          onComplete: () => {
            armTween = null;
            // Back to the fireplace, clear of the search.
            detective.targetX = DETECTIVE_HOME;
          },
        });
      },
    });
  }

  function pushTo(x: number, y: number, zoom = 1.22, hold = 1.2): void {
    if (reduced) return;
    const tl = track(gsap.timeline());
    tl.to(cam, { zoom, fx: x, fy: y, duration: 0.9, ease: "power2.inOut" });
    tl.to(cam, { zoom: 1.03, fx: DESIGN_W / 2, fy: DESIGN_H / 2, duration: 1.2, ease: "power2.inOut" }, `+=${hold}`);
  }

  function pulseGlow(sprite: Sprite, peak = 0.75, hold = 0.6): void {
    if (reduced) return;
    track(
      gsap
        .timeline()
        .to(sprite, { alpha: peak, duration: 0.35, ease: "power2.out" })
        .to(sprite, { alpha: 0, duration: 1.1, ease: "power2.in" }, `+=${hold}`),
    );
  }

  function placeGlowFor(clue: ClueId): Sprite {
    if (clue === "WINDOW") return room.placeGlows.window;
    if (clue === "BOX") return room.placeGlows.box;
    if (clue === "CLOCK") return room.placeGlows.clock;
    if (clue === "NOTE") return room.placeGlows.note;
    return room.placeGlows.hallDesk;
  }

  function applyLook(fig: Figure, look: SuspectLook): void {
    fig.look = look;
    const alpha = look === "cleared" ? 0.5 : 1;
    const rim = look === "cleared" ? 0.25 : 1;
    const spot = look === "culprit" ? 0.5 : 0;
    if (reduced) {
      fig.root.alpha = alpha;
      fig.rim.alpha = rim;
      fig.spot.alpha = spot;
      return;
    }
    gsap.to(fig.root, { alpha, duration: 0.8, ease: "power2.out" });
    gsap.to(fig.rim, { alpha: rim, duration: 0.8 });
    gsap.to(fig.spot, { alpha: spot, duration: 0.8 });
  }

  const applyMotion = (): void => {
    if (reduced) {
      killAll();
      app.ticker.stop();
      cam.zoom = 1.03;
      cam.fx = DESIGN_W / 2;
      cam.fy = DESIGN_H / 2;
      cam.shake = 0;
      flashLevel = 0;
      detective.x = DETECTIVE_HOME;
      detective.targetX = DETECTIVE_HOME;
      detective.facing = -1;
      detective.arm.rotation = 0.12;
      clockSpin = 0;
      render();
    }
    syncVisibility();
  };

  const fit = (): void => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const phone = window.matchMedia("(max-width: 760px)").matches;
    app.ticker.maxFPS = phone ? 45 : 60;
    app.renderer.resize(w, h, Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
    const s = Math.max(w / DESIGN_W, h / DESIGN_H);
    world.scale.set(s);
    world.position.set((w - DESIGN_W * s) / 2, (h - DESIGN_H * s) / 2);
    if (reduced) render();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  fit();

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    syncVisibility();
  });
  io.observe(host);
  document.addEventListener("visibilitychange", syncVisibility);
  syncVisibility();

  const pointerTarget = options.pointerTarget ?? host;
  let pointerFrame = 0;
  const onPointer = (event: PointerEvent): void => {
    const box = host.getBoundingClientRect();
    if (box.width === 0) return;
    pointer.cssX = event.clientX - box.left;
    pointer.cssY = event.clientY - box.top;
    pointer.inside = true;
    pointer.x = clamp((pointer.cssX / box.width) * 2 - 1, -1, 1);
    pointer.y = clamp((pointer.cssY / box.height) * 2 - 1, -1, 1);
    if (reduced && pointerFrame === 0) {
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        render();
      });
    }
  };
  const onLeave = (): void => {
    pointer.x = 0;
    pointer.y = 0;
    pointer.inside = false;
    if (reduced) render();
  };
  pointerTarget.addEventListener("pointermove", onPointer);
  pointerTarget.addEventListener("pointerleave", onLeave);

  if (reduced) {
    app.ticker.stop();
    render();
  }

  function addThread(link: LinkId, progress: number): Thread | null {
    if (threads.some((item) => item.link === link)) return null;
    const def = LINKS.find((item) => item.id === link);
    if (!def) return null;
    const from = evidenceCentre(def.a);
    const to = evidenceCentre(def.b);
    if (from.x === to.x && from.y === to.y) return null;
    const g = new Graphics();
    threadLayer.addChild(g);
    const thread: Thread = { link, g, progress, from, to };
    threads.push(thread);
    return thread;
  }

  // ------------------------------------------------------------------------------------------------------------
  // Handle

  const handle: StudyScene = {
    setPhase(next) {
      phase = next;
      if (next === "opening") {
        cam.zoom = 1.12;
        cam.fx = 860;
        cam.fy = 470;
        if (!reduced) track(gsap.to(cam, { zoom: 1.03, fx: DESIGN_W / 2, fy: DESIGN_H / 2, duration: 14, ease: "sine.inOut" }));
        else cam.zoom = 1.03;
      }
      if (next === "investigating") {
        killAll();
        cam.zoom = 1.03;
        cam.fx = DESIGN_W / 2;
        cam.fy = DESIGN_H / 2;
        dim.alpha = 0;
        memory.alpha = 0;
        if (!reduced) strike(0.7);
      }
      if (reduced) render();
    },
    introduce(suspect) {
      for (const [id, fig] of Object.entries(figures) as [SuspectId, Figure][]) {
        const on = suspect === null || suspect === id;
        const spot = suspect === id ? 0.55 : 0;
        if (reduced) {
          fig.spot.alpha = spot;
          fig.root.alpha = on ? 1 : 0.55;
        } else {
          gsap.to(fig.spot, { alpha: spot, duration: 0.7, ease: "power2.out" });
          gsap.to(fig.root, { alpha: on ? 1 : 0.55, duration: 0.7 });
        }
      }
      if (!reduced) {
        const fig = suspect ? figures[suspect] : null;
        track(
          gsap.to(cam, {
            zoom: fig ? 1.16 : 1.03,
            fx: fig ? fig.baseX : DESIGN_W / 2,
            fy: fig ? fig.baseY - 210 : DESIGN_H / 2,
            duration: 1.6,
            ease: "power2.inOut",
          }),
        );
      }
      if (reduced) render();
    },
    setFound(ids) {
      for (const [id, item] of Object.entries(portables) as [FindId, Container][]) {
        const gone = ids.includes(id);
        item.visible = !gone;
        item.alpha = 1;
        item.scale.set(1);
      }
      if (reduced) render();
    },
    setSuspects(states) {
      for (const [id, fig] of Object.entries(figures) as [SuspectId, Figure][]) {
        if (states[id] !== fig.look) applyLook(fig, states[id]);
      }
      if (reduced) render();
    },
    setThreads(links) {
      threadLayer.removeChildren().forEach((child) => child.destroy());
      threads.length = 0;
      for (const id of links) addThread(id, 1);
      if (reduced) render();
    },
    discoveryImage(id) {
      const item = FIND_ITEMS.find(entry => entry.id === id);
      if (!item) return null;
      try {
        const { x, y, w, h } = item.box;
        const padding = 36;
        // Re-render the vector room at inspection resolution, rather than enlarging screen pixels.
        const closeup = app.renderer.extract.canvas({ target: camera, frame: new Rectangle(x - w / 2 - padding, y - h / 2 - padding, w + padding * 2, h + padding * 2), resolution: 4, antialias: true });
        return (closeup as HTMLCanvasElement).toDataURL("image/png");
      } catch {
        return null;
      } finally {
        render();
      }
    },
    found(id) {
      const item = FIND_ITEMS.find((entry) => entry.id === id);
      if (!item) return;
      if (hintRing.visible && Math.hypot(hintRing.x - item.box.x, hintRing.y - item.box.y) < 4) hintRing.visible = false;
      const portable = portables[id];
      if (reduced) {
        if (portable) portable.visible = false;
        render();
        return;
      }
      spawnParticles(item.box.x, item.box.y, 14, C.gold, 170, 0.9);
      if (portable) {
        // Lift, brighten, and leave the room. Scale around the object's own centre.
        portable.pivot.set(item.box.x - portable.x, item.box.y - portable.y);
        portable.position.set(portable.x + portable.pivot.x, portable.y + portable.pivot.y);
        // Not tracked, for the same reason as the misclick mark: the object always finishes leaving.
        gsap
          .timeline()
          .to(portable.scale, { x: portable.scale.x * 1.25, y: portable.scale.y * 1.25, duration: 0.25, ease: "power2.out" })
          .to(portable, { y: portable.y - 40, alpha: 0, duration: 0.55, ease: "power2.in" })
          .call(() => {
            portable.visible = false;
          });
      } else if (item.clue) {
        pulseGlow(placeGlowFor(item.clue), 0.8, 0.5);
      }
    },
    hintAt(id) {
      const item = FIND_ITEMS.find((entry) => entry.id === id);
      if (!item) return;
      hintRing.position.set(item.box.x, item.box.y);
      hintRing.visible = true;
      hintRing.alpha = 1;
      hintUntil = elapsed + 4.5;
      if (reduced) render();
    },
    missAt(x, y, steady) {
      if (reduced) return;
      spawnParticles(x, y, 7, C.paperDim, 60, 0.5);
      const cross = new Graphics()
        .moveTo(-9, -9)
        .lineTo(9, 9)
        .moveTo(9, -9)
        .lineTo(-9, 9)
        .stroke({ width: 3, color: C.rose, cap: "round" });
      cross.position.set(x, y);
      effectLayer.addChild(cross);
      // Not tracked: a phase change must never leave a half-faded mark behind.
      gsap.to(cross, {
        alpha: 0,
        duration: 0.6,
        ease: "power1.in",
        onComplete: () => {
          cross.destroy();
        },
      });
      cam.shake = Math.max(cam.shake, steady ? 0.5 : 0.12);
    },
    inspect(clue) {
      // Under reduced motion the detective stays by the fireplace; the find list and notebook carry the result.
      if (reduced) return;
      const entry = CLUES.find((item) => item.id === clue);
      if (!entry) return;
      armTween?.kill();
      armTween = null;
      detective.arm.rotation = 0.12;
      detective.targetX = entry.standX;
      pendingAim = clue;
    },
    linked(link) {
      const thread = addThread(link, reduced ? 1 : 0);
      if (thread && !reduced) track(gsap.to(thread, { progress: 1, duration: 1.1, ease: "power2.inOut" }));
      if (!thread) {
        const def = LINKS.find((item) => item.id === link);
        if (def) pulseGlow(placeGlowFor(evidenceById(def.a).clue), 0.9, 0.4);
      }
      if (reduced) render();
    },
    miss() {
      if (reduced) return;
      cam.shake = Math.max(cam.shake, 0.35);
      track(
        gsap
          .timeline()
          .to(detective.head, { rotation: 0.18, duration: 0.18 })
          .to(detective.head, { rotation: -0.1, duration: 0.2 })
          .to(detective.head, { rotation: 0, duration: 0.3 }),
      );
    },
    timeline() {
      pulseGlow(room.placeGlows.clock, 0.9, 1.4);
      if (reduced) return;
      const spin = { v: 0 };
      track(
        gsap
          .timeline()
          .to(memory, { alpha: 0.16, duration: 0.5 })
          .to(
            spin,
            {
              v: 1,
              duration: 1.8,
              ease: "power2.inOut",
              onUpdate: () => {
                clockSpin = Math.sin(spin.v * Math.PI) * TAU * 2;
              },
              onComplete: () => {
                clockSpin = 0;
              },
            },
            0,
          )
          .to(memory, { alpha: 0, duration: 0.9 }, ">-0.2"),
      );
    },
    contradiction(clears) {
      if (!reduced) {
        track(gsap.timeline().to(wash, { alpha: 0.2, duration: 0.18 }).to(wash, { alpha: 0, duration: 1.1 }));
        cam.shake = Math.max(cam.shake, 0.25);
      }
      if (clears === null && !reduced) {
        // The clerk's own statement just broke: a brief spotlight and a glint behind her spectacles.
        const fig = figures.CLERK;
        track(gsap.timeline().to(fig.spot, { alpha: 0.6, duration: 0.4 }).to(fig.spot, { alpha: 0, duration: 1.4 }, "+=1.2"));
        pushTo(fig.baseX - 40, fig.baseY - 230);
        strike(0.8);
      }
      if (reduced) render();
    },
    hint() {
      if (reduced) return;
      track(gsap.timeline().to(room.lampGlow, { alpha: 0.42, duration: 0.3 }).to(room.lampGlow, { alpha: 0.2, duration: 1.2 }));
    },
    accusedWrong(suspect) {
      const fig = figures[suspect];
      if (reduced) {
        render();
        return;
      }
      strike(1);
      cam.shake = Math.max(cam.shake, 0.6);
      track(gsap.timeline().to(fig.spot, { alpha: 0.6, duration: 0.2 }).to(fig.spot, { alpha: 0, duration: 0.8 }, "+=0.6"));
    },
    beat(beat) {
      killAll();
      if (beat === null) {
        ghost.root.visible = false;
        if (reduced) render();
        return;
      }
      if (!reduced) {
        gsap.to(dim, { alpha: 0.32, duration: 0.8 });
        gsap.to(memory, { alpha: 0.12, duration: 0.8 });
      } else {
        dim.alpha = 0.32;
        memory.alpha = 0.12;
      }
      const ghostAt = (x: number, y: number, scale: number, show: boolean): void => {
        ghost.root.visible = true;
        if (reduced) {
          ghost.root.position.set(x, y);
          ghost.root.scale.set(-scale, scale);
          ghost.root.alpha = show ? 0.42 : 0;
          return;
        }
        gsap.to(ghost.root, { x, y, alpha: show ? 0.42 : 0, duration: 1.2, ease: "power2.inOut" });
        gsap.to(ghost.root.scale, { x: -scale, y: scale, duration: 1.2, ease: "power2.inOut" });
      };
      const light = (sprite: Sprite): void => {
        if (reduced) {
          sprite.alpha = 0.6;
          return;
        }
        track(gsap.timeline().to(sprite, { alpha: 0.7, duration: 0.5 }).to(sprite, { alpha: 0.15, duration: 1.4 }, "+=1.2"));
      };
      const spotOn = (fig: Figure): void => {
        if (reduced) fig.spot.alpha = 0.5;
        else track(gsap.to(fig.spot, { alpha: 0.5, duration: 0.6 }));
      };
      for (const fig of Object.values(figures)) fig.spot.alpha = 0;
      if (beat === "window") {
        ghostAt(1418, 668, 0.94, false);
        light(room.placeGlows.window);
        spotOn(figures.GARDENER);
      } else if (beat === "pen") {
        light(room.placeGlows.hallDesk);
        spotOn(figures.GUEST);
      } else if (beat === "key") {
        ghost.root.position.set(1418, 668);
        ghostAt(1520, 620, 0.72, true);
        light(room.placeGlows.hallDesk);
      } else if (beat === "box") {
        ghostAt(1070, 724, 1, true);
        light(room.placeGlows.box);
        light(room.placeGlows.clock);
      } else if (beat === "note") {
        ghostAt(820, 724, 1, true);
        light(room.placeGlows.note);
      } else if (beat === "alarm") {
        ghostAt(1418, 668, 0.94, false);
        strike(0.9);
        spotOn(figures.CLERK);
      }
      if (reduced) render();
    },
    finale() {
      killAll();
      ghost.root.visible = false;
      const clerkFig = figures.CLERK;
      // Everyone turns to the clerk; she steps into the light and the coat gives the manuscript up.
      figures.GARDENER.root.scale.x = Math.abs(figures.GARDENER.root.scale.x);
      figures.GUEST.root.scale.x = Math.abs(figures.GUEST.root.scale.x);
      if (reduced) {
        dim.alpha = 0.1;
        memory.alpha = 0;
        clerkFig.spot.alpha = 0.6;
        clerkFig.root.x = clerkFig.baseX - 70;
        clerkParts.manuscript.alpha = 1;
        clerkParts.manuscript.y = 18;
        for (const fig of Object.values(figures)) fig.root.alpha = fig === clerkFig ? 1 : 0.7;
        render();
        return;
      }
      strike(1);
      const tl = track(gsap.timeline());
      tl.to(dim, { alpha: 0.18, duration: 1 }, 0);
      tl.to(memory, { alpha: 0, duration: 1 }, 0);
      tl.to(clerkFig.spot, { alpha: 0.62, duration: 0.8 }, 0.3);
      tl.to(clerkFig.root, { x: clerkFig.baseX - 70, duration: 1.4, ease: "power2.inOut" }, 0.5);
      tl.to(cam, { zoom: 1.22, fx: clerkFig.baseX - 120, fy: clerkFig.baseY - 220, duration: 2.2, ease: "power2.inOut" }, 0.4);
      tl.fromTo(clerkParts.manuscript, { alpha: 0, y: -10 }, { alpha: 1, y: 18, duration: 0.9, ease: "back.out(2)" }, 1.8);
      tl.to(figures.GARDENER.root, { alpha: 0.7, duration: 0.8 }, 1.2);
      tl.to(figures.GUEST.root, { alpha: 0.7, duration: 0.8 }, 1.2);
      tl.to(cam, { zoom: 1.04, fx: DESIGN_W / 2 + 120, fy: DESIGN_H / 2, duration: 2.6, ease: "sine.inOut" }, 4.2);
    },
    lightning() {
      strike(1);
    },
    setReducedMotion(next) {
      reduced = next;
      applyMotion();
    },
    reset() {
      killAll();
      phase = "opening";
      pendingAim = null;
      detective.x = DETECTIVE_HOME;
      detective.targetX = DETECTIVE_HOME;
      detective.facing = -1;
      detective.arm.rotation = 0.12;
      dim.alpha = 0;
      memory.alpha = 0;
      wash.alpha = 0;
      clockSpin = 0;
      hintRing.visible = false;
      ghost.root.visible = false;
      clerkParts.manuscript.alpha = 0;
      clerkParts.manuscript.y = 0;
      figures.GARDENER.root.scale.x = 1;
      figures.GUEST.root.scale.x = -1;
      for (const fig of Object.values(figures)) {
        fig.root.x = fig.baseX;
        fig.root.alpha = 1;
        fig.rim.alpha = 1;
        fig.spot.alpha = 0;
        fig.look = "neutral";
      }
      for (const item of Object.values(portables)) {
        if (!item) continue;
        item.visible = true;
        item.alpha = 1;
        item.scale.set(1);
        item.position.set(item.position.x - item.pivot.x, item.position.y - item.pivot.y);
        item.pivot.set(0, 0);
      }
      // The umbrella keeps its own placement.
      if (portables.UMBRELLA) {
        portables.UMBRELLA.position.set(548, 766);
        portables.UMBRELLA.rotation = -0.13;
      }
      threadLayer.removeChildren().forEach((child) => child.destroy());
      threads.length = 0;
      particles.length = 0;
      effectLayer.removeChildren().forEach((child) => child.destroy());
      if (reduced) render();
    },
    destroy() {
      killAll();
      document.removeEventListener("visibilitychange", syncVisibility);
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(pointerFrame);
      pointerTarget.removeEventListener("pointermove", onPointer);
      pointerTarget.removeEventListener("pointerleave", onLeave);
      const textures = new Set<Texture>();
      const collect = (node: Container): void => {
        if ("texture" in node && node.texture instanceof Texture && node.texture !== Texture.WHITE && node.texture !== Texture.EMPTY) textures.add(node.texture);
        for (const child of node.children) collect(child);
      };
      collect(app.stage);
      app.destroy(true, { children: true, texture: false, textureSource: false });
      textures.forEach(texture => texture.destroy(!portraitFrames.has(texture)));
      canvas.remove();
    },
  };

  handle.setPhase("opening");
  return handle;
}
