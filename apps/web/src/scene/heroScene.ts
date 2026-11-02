import { Application, Container, Graphics, Sprite, Text, Texture, TilingSprite } from "pixi.js";

// PixiJS scene for the site's hero and banners: a detective in a fedora studies an evidence board under a swinging
// lamp, with rain on the window behind. Everything is drawn in code, so the scene ships no raster art. The page
// can make the board answer chat: pulse() flashes a pinned item, and connect() draws a new red thread between two.
//
// Design space is 1600 x 900. The host crops it like CSS `object-fit: cover`, and focusX/focusY choose which part
// stays in view. The canvas is decorative and hidden from assistive technology. Under reduced motion the ticker
// stays stopped and each change paints one still frame.

export interface HeroScene {
  /** Flash one pinned item, as if chat just looked at it. */
  pulse(index: number): void;
  /** Draw a new red thread between two pinned items. */
  connect(a: number, b: number): void;
  setReducedMotion(reduced: boolean): void;
  destroy(): void;
}

export interface HeroSceneOptions {
  reduced: boolean;
  /** Which part of the design stays in view when the host crops it, 0..1 on each axis. */
  focusX?: number;
  focusY?: number;
  /** Element whose pointer moves drive the parallax. Defaults to the host. */
  pointerTarget?: HTMLElement;
  /** Called when lightning strikes, with 0..1 strength. */
  onLightning?: (strength: number) => void;
}

const W = 1600;
const H = 900;
const TAU = Math.PI * 2;

// Palette: Cinematic Brown Noir. No blue, cyan, or purple.
const C = {
  ink: 0x0b0806,
  ink2: 0x140d09,
  walnut: 0x2a1c13,
  espresso: 0x1d140d,
  leather: 0x65432d,
  brass: 0xa77a48,
  gold: 0xd9b681,
  paper: 0xe9decb,
  paperDim: 0xcdbfa6,
  wine: 0x3d1d1b,
  thread: 0xb4412f,
  pin: 0xb8402f,
  lamp: 0xffd08a,
  ember: 0xe0a050,
} as const;

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

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  draw(ctx);
  return Texture.from(canvas);
}

function glowTexture(): Texture {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.42)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

function coneTexture(): Texture {
  return canvasTexture(256, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(98, 0);
    ctx.lineTo(158, 0);
    ctx.lineTo(256, 512);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.fill();
  });
}

function wallTexture(): Texture {
  return canvasTexture(64, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#1c130d");
    g.addColorStop(0.6, "#140d09");
    g.addColorStop(1, "#0c0806");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 512);
  });
}

// Cork: a warm brown base with dark and light flecks, tiled across the board.
function corkTexture(): Texture {
  const rand = rng(77);
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#5a3d24";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i += 1) {
      const x = rand() * 256;
      const y = rand() * 256;
      const r = 0.4 + rand() * 1.6;
      const light = rand() < 0.45;
      ctx.fillStyle = light ? `rgba(150,108,66,${0.25 + rand() * 0.35})` : `rgba(30,18,10,${0.25 + rand() * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  });
}

function vignetteTexture(): Texture {
  return canvasTexture(512, 288, (ctx) => {
    const g = ctx.createRadialGradient(300, 140, 60, 280, 150, 330);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.7, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 288);
  });
}

function glow(tex: Texture, x: number, y: number, w: number, h: number, color: number, alpha: number): Sprite {
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ---------------------------------------------------------------------------------------------------------------
// The board's pinned items

type Kind = "portrait" | "manor" | "print" | "time" | "plan" | "cap" | "page" | "ticket";

interface Pinned {
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

const ITEMS: readonly Pinned[] = [
  { kind: "portrait", x: 905, y: 238, w: 120, h: 150, rot: -0.06 },
  { kind: "manor", x: 1080, y: 205, w: 172, h: 122, rot: 0.04 },
  { kind: "print", x: 1262, y: 236, w: 128, h: 158, rot: -0.03 },
  { kind: "time", x: 1436, y: 214, w: 142, h: 112, rot: 0.07 },
  { kind: "plan", x: 1452, y: 432, w: 182, h: 140, rot: -0.05 },
  { kind: "cap", x: 1258, y: 456, w: 118, h: 150, rot: 0.05 },
  { kind: "page", x: 1070, y: 436, w: 152, h: 104, rot: -0.08 },
  { kind: "ticket", x: 902, y: 478, w: 110, h: 84, rot: 0.1 },
];

/** Threads on the board when the scene opens. */
const BASE_THREADS: readonly (readonly [number, number])[] = [
  [0, 2],
  [2, 3],
  [1, 6],
  [6, 4],
  [0, 7],
  [7, 5],
  [5, 4],
  [2, 5],
];

function pinPoint(item: Pinned): { x: number; y: number } {
  const dy = -item.h / 2 + 12;
  return { x: item.x - Math.sin(item.rot) * dy, y: item.y + Math.cos(item.rot) * dy };
}

function drawPaper(g: Graphics, w: number, h: number, color: number): void {
  g.rect(-w / 2 + 5, -h / 2 + 7, w, h).fill({ color: 0x000000, alpha: 0.45 });
  g.rect(-w / 2, -h / 2, w, h).fill(color);
}

function drawItem(item: Pinned): Container {
  const c = new Container();
  c.position.set(item.x, item.y);
  c.rotation = item.rot;
  const g = new Graphics();
  const { w, h } = item;
  const hw = w / 2;
  const hh = h / 2;
  switch (item.kind) {
    case "portrait":
    case "cap": {
      drawPaper(g, w, h, 0xe3d6bf);
      g.rect(-hw + 8, -hh + 8, w - 16, h - 30).fill(0x3a2a1d);
      g.rect(-hw + 8, -hh + 8, w - 16, h - 30).fill({ color: 0x6b4a2c, alpha: 0.25 });
      const cy = -hh + 8 + (h - 30) * 0.42;
      g.ellipse(0, cy, w * 0.15, w * 0.19).fill(0x1a120c);
      g.moveTo(-hw + 14, hh - 22)
        .quadraticCurveTo(-hw + 18, cy + w * 0.2, 0, cy + w * 0.18)
        .quadraticCurveTo(hw - 18, cy + w * 0.2, hw - 14, hh - 22)
        .closePath()
        .fill(0x1a120c);
      if (item.kind === "cap") {
        g.ellipse(0, cy - w * 0.13, w * 0.2, w * 0.05).fill(0x1a120c);
        g.ellipse(w * 0.02, cy - w * 0.17, w * 0.14, w * 0.09).fill(0x1a120c);
      } else {
        g.moveTo(-w * 0.13, cy - w * 0.12)
          .quadraticCurveTo(0, cy - w * 0.3, w * 0.15, cy - w * 0.1)
          .closePath()
          .fill(0x1a120c);
      }
      g.rect(-hw + 14, hh - 16, w * 0.5, 3).fill({ color: 0x6b4a30, alpha: 0.6 });
      break;
    }
    case "manor": {
      drawPaper(g, w, h, 0xe3d6bf);
      const top = -hh + 8;
      const ih = h - 26;
      g.rect(-hw + 8, top, w - 16, ih).fill(0x4a3624);
      g.rect(-hw + 8, top + ih * 0.55, w - 16, ih * 0.45).fill(0x2a1d14);
      g.poly([-hw + 22, top + ih, -hw + 22, top + ih * 0.42, -18, top + ih * 0.2, 30, top + ih * 0.42, 30, top + ih])
        .fill(0x15100b);
      g.poly([30, top + ih, 30, top + ih * 0.5, 54, top + ih * 0.34, hw - 18, top + ih * 0.5, hw - 18, top + ih])
        .fill(0x15100b);
      for (const [wx, wy] of [
        [-36, 0.58],
        [-10, 0.58],
        [44, 0.66],
        [62, 0.66],
      ] as const) {
        g.rect(wx, top + ih * wy, 7, 9).fill({ color: 0xf0c27a, alpha: 0.9 });
      }
      break;
    }
    case "print": {
      drawPaper(g, w, h, C.paper);
      for (let i = 0; i < 9; i += 1) {
        g.ellipse(0, 6, 8 + i * 5.2, 11 + i * 6.4).stroke({ width: 1.6, color: 0x5d3f27, alpha: 0.62 });
      }
      g.rect(-hw + 10, -hh + 10, w - 20, 10).fill({ color: 0x5d3f27, alpha: 0.35 });
      break;
    }
    case "time": {
      drawPaper(g, w, h, 0xeee3cf);
      for (let i = 0; i < 4; i += 1) g.rect(-hw + 10, -hh + 22 + i * 20, w - 20, 1).fill({ color: 0xb98e6a, alpha: 0.4 });
      break;
    }
    case "plan": {
      drawPaper(g, w, h, 0xddd0b8);
      g.rect(-hw + 14, -hh + 14, w - 28, h - 28).stroke({ width: 2, color: 0x5d3f27, alpha: 0.75 });
      g.moveTo(-hw + 14, 4).lineTo(10, 4).lineTo(10, hh - 14).stroke({ width: 2, color: 0x5d3f27, alpha: 0.75 });
      g.moveTo(10, -hh + 40).lineTo(hw - 14, -hh + 40).stroke({ width: 2, color: 0x5d3f27, alpha: 0.75 });
      for (let i = 0; i < 6; i += 1) {
        g.circle(-hw + 34 + i * 18, hh - 30 - i * 9, 2.4).fill({ color: C.thread, alpha: 0.85 });
      }
      g.circle(hw - 40, -hh + 66, 9).stroke({ width: 2, color: C.thread, alpha: 0.9 });
      break;
    }
    case "page": {
      drawPaper(g, w, h, 0xe8dcc6);
      g.poly([hw, -hh, hw, hh, hw - 12, hh - 8, hw - 4, hh - 22, hw - 14, -hh + 30, hw - 4, -hh + 10]).fill(0x2a1d14);
      for (let i = 0; i < 5; i += 1) {
        const y = -hh + 20 + i * 15;
        g.moveTo(-hw + 12, y);
        for (let x = -hw + 12; x < hw - 26; x += 10) g.lineTo(x + 10, y + Math.sin(x * 0.4 + i) * 2);
        g.stroke({ width: 1.4, color: 0x4a3020, alpha: 0.6 });
      }
      g.moveTo(-hw + 12, hh - 16).lineTo(hw - 40, hh - 18).stroke({ width: 2.2, color: C.thread, alpha: 0.85 });
      break;
    }
    case "ticket": {
      drawPaper(g, w, h, 0xd9c7a8);
      g.rect(-hw + 8, -hh + 8, w - 16, 14).fill({ color: 0x8a5b34, alpha: 0.55 });
      for (let i = 0; i < 3; i += 1) g.rect(-hw + 10, -hh + 32 + i * 13, w - 30 - i * 10, 2).fill({ color: 0x4a3020, alpha: 0.5 });
      break;
    }
  }
  c.addChild(g);
  if (item.kind === "time") {
    const t = new Text({
      text: "20:52",
      style: { fontFamily: "Cluenite EB Garamond, Georgia, serif", fontSize: 40, fill: 0x2d1d12, fontWeight: "600" },
    });
    t.anchor.set(0.5);
    t.position.set(0, -4);
    const note = new Text({
      text: "clock stopped",
      style: { fontFamily: "Cluenite Inter, Inter, Arial, sans-serif", fontSize: 13, fill: 0x6b4a30 },
    });
    note.anchor.set(0.5);
    note.position.set(0, 30);
    c.addChild(t, note);
  }
  const flash = new Graphics().rect(-hw, -hh, w, h).fill(0xfff1d6);
  flash.alpha = 0;
  flash.blendMode = "add";
  c.addChild(flash);
  return c;
}

function drawPin(x: number, y: number): Graphics {
  return new Graphics()
    .circle(x + 2, y + 4, 7)
    .fill({ color: 0x000000, alpha: 0.4 })
    .circle(x, y, 7)
    .fill(C.pin)
    .circle(x - 2.2, y - 2.4, 2.4)
    .fill({ color: 0xffffff, alpha: 0.7 });
}

// ---------------------------------------------------------------------------------------------------------------
// The detective

interface Figure {
  root: Container;
  torso: Container;
  head: Container;
  arm: Container;
  glint: Graphics;
}

function rim(g: Graphics, alpha: number, width = 2.6): Graphics {
  return g.stroke({ width, color: C.gold, alpha, cap: "round", join: "round" });
}

/** An open path along part of an ellipse, for rim light on round edges. Angles run clockwise from 3 o'clock. */
function ellipseArc(cx: number, cy: number, rx: number, ry: number, from: number, to: number): Graphics {
  const g = new Graphics();
  const steps = 18;
  for (let i = 0; i <= steps; i += 1) {
    const a = from + ((to - from) * i) / steps;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  return g;
}

/** Arm angles: hanging behind the coat, and raised toward the board. */
const ARM_DOWN = 2.4;
const ARM_UP = 0.1;

function buildDetective(): Figure {
  const root = new Container();
  root.position.set(1000, 900);
  const torso = new Container();
  const coat = new Graphics()
    .moveTo(-196, 10)
    .lineTo(-206, -160)
    .quadraticCurveTo(-212, -296, -152, -334)
    .quadraticCurveTo(-96, -362, -50, -368)
    .lineTo(50, -368)
    .quadraticCurveTo(96, -362, 152, -334)
    .quadraticCurveTo(212, -296, 206, -160)
    .lineTo(196, 10)
    .closePath()
    .fill(C.ink);
  // Seams and a belt catch a little lamp light.
  const seams = new Graphics()
    .moveTo(-118, -330)
    .quadraticCurveTo(-128, -220, -112, -90)
    .stroke({ width: 2, color: C.walnut, alpha: 0.7 })
    .moveTo(-150, -150)
    .lineTo(150, -150)
    .stroke({ width: 3, color: C.walnut, alpha: 0.5 });
  const collar = new Graphics()
    .poly([-62, -356, -34, -432, -8, -366])
    .fill(0x18100b)
    .poly([62, -356, 34, -432, 8, -366])
    .fill(0x18100b);
  torso.addChild(coat, seams, collar);
  torso.addChild(
    rim(new Graphics().moveTo(152, -334).quadraticCurveTo(212, -296, 206, -160).lineTo(200, -40), 0.5),
    rim(new Graphics().moveTo(62, -356).lineTo(34, -432), 0.4, 2),
  );
  torso.pivot.set(0, 0);

  const head = new Container();
  head.addChild(
    new Graphics().rect(-26, -404, 52, 50).fill(C.ink),
    new Graphics().ellipse(0, -446, 46, 56).fill(C.ink),
    new Graphics().ellipse(44, -446, 9, 16).fill(0x120c08),
    // Fedora: crown with a pinched top, band, and a wide brim.
    new Graphics()
      .moveTo(-64, -486)
      .quadraticCurveTo(-60, -546, -50, -566)
      .quadraticCurveTo(-26, -580, -6, -568)
      .lineTo(0, -560)
      .lineTo(6, -568)
      .quadraticCurveTo(26, -580, 50, -566)
      .quadraticCurveTo(60, -546, 64, -486)
      .closePath()
      .fill(0x0e0907),
    new Graphics()
      .moveTo(-63, -486)
      .lineTo(63, -486)
      .lineTo(61, -506)
      .lineTo(-61, -506)
      .closePath()
      .fill(0x2a1c13),
    new Graphics().moveTo(-61, -506).lineTo(61, -506).stroke({ width: 1.5, color: C.gold, alpha: 0.3 }),
    new Graphics().ellipse(0, -484, 116, 21).fill(0x0e0907),
  );
  head.addChild(
    rim(new Graphics().moveTo(50, -566).quadraticCurveTo(60, -546, 64, -490), 0.65),
    rim(ellipseArc(0, -484, 116, 21, -1.35, 0.1), 0.42, 2.2),
    rim(ellipseArc(0, -446, 46, 56, -0.4, 0.7), 0.45, 2.2),
    rim(ellipseArc(44, -446, 9, 16, -1.2, 1.2), 0.5, 1.6),
  );
  head.pivot.set(0, -368);
  head.position.set(0, -368);

  // The right arm lifts a magnifying glass toward the board now and then.
  const arm = new Container();
  arm.position.set(150, -318);
  arm.addChild(
    new Graphics()
      .moveTo(-30, 8)
      .quadraticCurveTo(40, -60, 108, -150)
      .lineTo(136, -132)
      .quadraticCurveTo(70, -40, 22, 34)
      .closePath()
      .fill(C.ink),
    new Graphics().ellipse(124, -150, 20, 15).fill(0x120c08),
    new Graphics().moveTo(130, -160).lineTo(160, -196).stroke({ width: 7, color: C.walnut, cap: "round" }),
    new Graphics().circle(178, -222, 34).fill({ color: C.paper, alpha: 0.07 }),
    new Graphics().circle(178, -222, 34).stroke({ width: 6, color: C.brass }),
    rim(new Graphics().moveTo(108, -150).quadraticCurveTo(40, -60, -30, 8), 0.4, 2),
  );
  const glint = new Graphics().circle(166, -236, 6).fill({ color: 0xffffff, alpha: 0.9 });
  glint.alpha = 0;
  arm.addChild(glint);
  arm.rotation = ARM_DOWN;
  root.addChild(arm, torso, head);
  return { root, torso, head, arm, glint };
}

// ---------------------------------------------------------------------------------------------------------------

interface Thread {
  a: number;
  b: number;
  progress: number;
  delay: number;
  base: boolean;
}

interface Pulse {
  index: number;
  t: number;
  ring: Graphics;
}

export async function createHeroScene(host: HTMLElement, options: HeroSceneOptions): Promise<HeroScene> {
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
  host.appendChild(canvas);
  app.stage.eventMode = "none";

  let reduced = options.reduced;
  const focusX = clamp(options.focusX ?? 0.7, 0, 1);
  const focusY = clamp(options.focusY ?? 0.3, 0, 1);
  const rand = rng(1931);
  const tex = { glow: glowTexture(), cone: coneTexture() };

  const world = new Container();
  app.stage.addChild(world);
  const back = new Container();
  const windowLayer = new Container();
  const boardLayer = new Container();
  const lightLayer = new Container();
  const figureLayer = new Container();
  const front = new Container();
  const fx = new Container();
  world.addChild(back, windowLayer, boardLayer, lightLayer, figureLayer, front, fx);

  // Wall, wallpaper stripes, and the wainscot.
  const wall = new Sprite(wallTexture());
  wall.width = W + 80;
  wall.height = H;
  wall.position.set(-40, 0);
  back.addChild(wall);
  const stripes = new Graphics();
  for (let x = -40; x < W + 40; x += 46) stripes.rect(x, 0, 2, 700).fill({ color: C.brass, alpha: 0.035 });
  back.addChild(stripes);
  back.addChild(
    new Graphics()
      .rect(-40, 700, W + 80, 200)
      .fill(0x110b08)
      .rect(-40, 698, W + 80, 4)
      .fill({ color: C.brass, alpha: 0.22 }),
  );
  for (let x = 20; x < W; x += 230) {
    back.addChild(new Graphics().roundRect(x, 730, 190, 130, 4).stroke({ width: 2, color: C.brass, alpha: 0.08 }));
  }

  // Window with the city and rain behind the copy.
  const glass = { x: 168, y: 138, w: 374, h: 448 };
  const outside = new Container();
  const sky = new Sprite(
    canvasTexture(8, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#0b0807");
      g.addColorStop(0.65, "#1d140d");
      g.addColorStop(1, "#3a2414");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 256);
    }),
  );
  sky.position.set(glass.x, glass.y);
  sky.width = glass.w;
  sky.height = glass.h;
  outside.addChild(sky);
  for (let i = 0; i < 16; i += 1) {
    outside.addChild(
      glow(
        tex.glow,
        glass.x + rand() * glass.w,
        glass.y + glass.h * (0.5 + rand() * 0.45),
        18 + rand() * 46,
        18 + rand() * 46,
        rand() < 0.7 ? C.ember : C.lamp,
        0.08 + rand() * 0.22,
      ),
    );
  }
  const roofs = new Graphics().moveTo(glass.x, glass.y + glass.h);
  let rx = glass.x;
  while (rx < glass.x + glass.w) {
    const top = glass.y + glass.h - 60 - rand() * 90;
    const bw = 30 + rand() * 50;
    roofs.lineTo(rx, top).lineTo(rx + bw * 0.5, top - rand() * 18).lineTo(rx + bw, top);
    rx += bw;
  }
  roofs.lineTo(glass.x + glass.w, glass.y + glass.h).closePath().fill(0x0a0706);
  outside.addChild(roofs);
  const drops: { g: Graphics; x: number; y: number; speed: number; len: number }[] = [];
  for (let i = 0; i < 70; i += 1) {
    const len = 14 + rand() * 22;
    const g = new Graphics().moveTo(0, 0).lineTo(-len * 0.18, len).stroke({ width: 1.2, color: C.paper, alpha: 0.12 + rand() * 0.2 });
    const drop = { g, x: glass.x + rand() * glass.w, y: glass.y + rand() * glass.h, speed: 520 + rand() * 380, len };
    g.position.set(drop.x, drop.y);
    outside.addChild(g);
    drops.push(drop);
  }
  const flash = new Graphics().rect(glass.x, glass.y, glass.w, glass.h).fill(0xf3e6cc);
  flash.alpha = 0;
  outside.addChild(flash);
  const glassMask = new Graphics().rect(glass.x, glass.y, glass.w, glass.h).fill(0xffffff);
  outside.mask = glassMask;
  windowLayer.addChild(outside, glassMask);
  const frame = new Graphics()
    .rect(glass.x - 16, glass.y - 16, glass.w + 32, glass.h + 32)
    .stroke({ width: 16, color: C.walnut })
    .rect(glass.x + glass.w / 2 - 5, glass.y, 10, glass.h)
    .fill(C.walnut)
    .rect(glass.x, glass.y + glass.h / 3 - 4, glass.w, 8)
    .fill(C.walnut)
    .rect(glass.x, glass.y + (glass.h * 2) / 3 - 4, glass.w, 8)
    .fill(C.walnut)
    .rect(glass.x - 26, glass.y + glass.h + 12, glass.w + 52, 14)
    .fill(0x342317);
  windowLayer.addChild(frame);
  // Heavy curtains with folds.
  for (const side of [-1, 1] as const) {
    const x0 = side < 0 ? glass.x - 74 : glass.x + glass.w + 6;
    const drape = new Graphics().rect(x0, 92, 70, 620).fill(C.wine);
    for (let f = 0; f < 4; f += 1) drape.rect(x0 + 8 + f * 16, 92, 6, 620).fill({ color: 0x000000, alpha: 0.28 });
    drape.rect(x0, 92, 70, 620).fill({ color: 0x000000, alpha: 0.35 });
    windowLayer.addChild(drape);
  }
  windowLayer.addChild(new Graphics().rect(glass.x - 90, 80, glass.w + 180, 26).fill(0x1d120c));

  // The evidence board.
  const board = { x: 820, y: 112, w: 740, h: 500 };
  const cork = new TilingSprite({ texture: corkTexture(), width: board.w, height: board.h });
  cork.position.set(board.x, board.y);
  boardLayer.addChild(
    new Graphics().rect(board.x - 22, board.y - 22, board.w + 44, board.h + 44).fill(0x241710),
    cork,
    new Graphics().rect(board.x, board.y, board.w, board.h).fill({ color: 0x0c0705, alpha: 0.32 }),
    new Graphics()
      .rect(board.x - 22, board.y - 22, board.w + 44, board.h + 44)
      .stroke({ width: 3, color: C.brass, alpha: 0.35 })
      .rect(board.x - 4, board.y - 4, board.w + 8, board.h + 8)
      .stroke({ width: 2, color: 0x000000, alpha: 0.5 }),
  );
  const itemViews = ITEMS.map((item) => {
    const view = drawItem(item);
    boardLayer.addChild(view);
    return view;
  });
  const threadLayer = new Graphics();
  boardLayer.addChild(threadLayer);
  for (const item of ITEMS) {
    const p = pinPoint(item);
    boardLayer.addChild(drawPin(p.x, p.y));
  }
  // Pulse rings sit on the board, so they follow its parallax.
  const ringLayer = new Container();
  boardLayer.addChild(ringLayer);

  // Lamp: a pendant that sways from the ceiling, with a cone of light across the board.
  const lamp = new Container();
  lamp.position.set(1130, -30);
  const coneSprite = new Sprite(tex.cone);
  coneSprite.anchor.set(0.5, 0);
  coneSprite.position.set(0, 168);
  coneSprite.width = 980;
  coneSprite.height = 860;
  coneSprite.tint = C.lamp;
  coneSprite.alpha = 0.13;
  coneSprite.blendMode = "add";
  const bulb = glow(tex.glow, 0, 166, 150, 110, C.lamp, 0.95);
  lamp.addChild(
    coneSprite,
    new Graphics().moveTo(0, 0).lineTo(0, 104).stroke({ width: 3, color: 0x2a1c13 }),
    new Graphics()
      .moveTo(-24, 100)
      .lineTo(24, 100)
      .lineTo(78, 168)
      .quadraticCurveTo(0, 182, -78, 168)
      .closePath()
      .fill(0x3a2817),
    new Graphics().moveTo(-78, 168).quadraticCurveTo(0, 182, 78, 168).stroke({ width: 3, color: C.gold, alpha: 0.65 }),
    new Graphics().moveTo(-20, 104).lineTo(-62, 160).stroke({ width: 2, color: C.gold, alpha: 0.18 }),
    bulb,
  );
  const ambient = glow(tex.glow, 1150, 360, 1100, 720, C.ember, 0.16);
  const backlight = glow(tex.glow, 1010, 560, 760, 640, C.ember, 0.14);
  lightLayer.addChild(ambient, backlight, lamp);

  // Dust in the light.
  const motes: { g: Graphics; x: number; y: number; vx: number; vy: number; phase: number }[] = [];
  for (let i = 0; i < 40; i += 1) {
    const g = new Graphics().circle(0, 0, 0.8 + rand() * 1.8).fill({ color: 0xffe2b5, alpha: 1 });
    const mote = { g, x: 900 + rand() * 520, y: 160 + rand() * 520, vx: (rand() - 0.5) * 9, vy: (rand() - 0.5) * 6, phase: rand() * TAU };
    g.position.set(mote.x, mote.y);
    g.blendMode = "add";
    lightLayer.addChild(g);
    motes.push(mote);
  }

  // The detective, then the desk in front of him.
  const figure = buildDetective();
  figureLayer.addChild(figure.root);

  const desk = new Container();
  desk.addChild(
    new Graphics().poly([560, 900, 600, 822, W + 40, 822, W + 40, 900]).fill(0x1d130c),
    new Graphics().moveTo(600, 822).lineTo(W + 40, 822).stroke({ width: 3, color: C.brass, alpha: 0.3 }),
    new Graphics()
      .poly([1170, 830, 1330, 816, 1342, 856, 1178, 872])
      .fill({ color: C.paperDim, alpha: 0.55 })
      .poly([1210, 846, 1366, 838, 1370, 880, 1214, 886])
      .fill({ color: C.paper, alpha: 0.5 }),
    new Graphics().ellipse(1450, 846, 66, 14).fill(0x2a1c13),
    new Graphics()
      .moveTo(1416, 790)
      .lineTo(1484, 790)
      .quadraticCurveTo(1482, 840, 1450, 842)
      .quadraticCurveTo(1418, 840, 1416, 790)
      .closePath()
      .fill(0x3a2817),
    new Graphics().ellipse(1450, 790, 34, 8).fill(0x140d09).stroke({ width: 2, color: C.gold, alpha: 0.45 }),
  );
  const steam: Graphics[] = [];
  for (let i = 0; i < 3; i += 1) {
    const s = new Graphics();
    desk.addChild(s);
    steam.push(s);
  }
  front.addChild(desk);

  // Haze and vignette over everything.
  const haze = [0, 1, 2].map((i) => {
    const h = glow(tex.glow, 300 + i * 520, 420 + i * 60, 900, 380, 0x8a5a30, 0.05);
    fx.addChild(h);
    return h;
  });
  const roomFlash = new Graphics().rect(-40, 0, W + 80, H).fill(0xf3e6cc);
  roomFlash.alpha = 0;
  roomFlash.blendMode = "add";
  fx.addChild(roomFlash);
  const vignette = new Sprite(vignetteTexture());
  vignette.width = W + 80;
  vignette.height = H;
  vignette.position.set(-40, 0);
  fx.addChild(vignette);

  // ------------------------------------------------------------------------------------------------------------
  // State and drawing

  const threads: Thread[] = BASE_THREADS.map(([a, b], i) => ({ a, b, progress: 0, delay: 0.5 + i * 0.28, base: true }));
  const pulses: Pulse[] = [];
  let time = 0;
  let visible = true;
  let flashLevel = 0;
  let nextLightning = 6 + rand() * 8;
  let armPhase: "down" | "up" | "hold" | "lower" = "down";
  let armT = 0;
  let nextArm = 3.5;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

  function drawThreads(t: number): void {
    threadLayer.clear();
    for (const [i, thread] of threads.entries()) {
      if (thread.progress <= 0) continue;
      const a = pinPoint(ITEMS[thread.a] as Pinned);
      const b = pinPoint(ITEMS[thread.b] as Pinned);
      const sway = reduced ? 0 : Math.sin(t * 0.9 + i * 1.3) * 3;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 + 22 + sway;
      const steps = 22;
      const end = Math.max(1, Math.round(steps * thread.progress));
      const pts: number[] = [];
      for (let s = 0; s <= end; s += 1) {
        const v = Math.min(s / steps, thread.progress);
        const x = (1 - v) * (1 - v) * a.x + 2 * (1 - v) * v * mx + v * v * b.x;
        const y = (1 - v) * (1 - v) * a.y + 2 * (1 - v) * v * my + v * v * b.y;
        pts.push(x, y);
      }
      for (const [width, alpha] of [
        [7, 0.16],
        [2.4, 0.95],
      ] as const) {
        threadLayer.moveTo(pts[0] ?? a.x, pts[1] ?? a.y);
        for (let p = 2; p < pts.length; p += 2) threadLayer.lineTo(pts[p] ?? 0, pts[p + 1] ?? 0);
        threadLayer.stroke({ width, color: C.thread, alpha: thread.base ? alpha : Math.min(1, alpha * 1.15), cap: "round" });
      }
    }
  }

  function drawSteam(t: number): void {
    for (const [i, s] of steam.entries()) {
      s.clear();
      const phase = (t * 0.35 + i / 3) % 1;
      const baseX = 1438 + i * 12;
      const y0 = 784 - phase * 90;
      s.moveTo(baseX, y0 + 40);
      for (let k = 0; k <= 8; k += 1) {
        const y = y0 + 40 - k * 9;
        const x = baseX + Math.sin(t * 1.6 + k * 0.7 + i) * (4 + k * 1.2);
        s.lineTo(x, y);
      }
      s.stroke({ width: 3, color: 0xf1dfc2, alpha: 0.16 * Math.sin(phase * Math.PI) });
    }
  }

  function strike(): void {
    flashLevel = 1;
    options.onLightning?.(0.5 + rand() * 0.5);
  }

  function render(): void {
    app.renderer.render(app.stage);
  }

  function paintStill(): void {
    for (const thread of threads) thread.progress = 1;
    lamp.rotation = 0.012;
    figure.arm.rotation = ARM_DOWN;
    figure.glint.alpha = 0;
    flashLevel = 0;
    flash.alpha = 0;
    roomFlash.alpha = 0;
    for (const item of itemViews) (item.children[item.children.length - 1] as Graphics).alpha = 0;
    ringLayer.removeChildren().forEach((child) => child.destroy());
    pulses.length = 0;
    drawThreads(0);
    drawSteam(0.6);
    render();
  }

  app.ticker.add((ticker) => {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    time += dt;

    // Parallax eases toward the pointer.
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 3);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 3);
    windowLayer.position.set(-pointer.sx * 6, -pointer.sy * 4);
    boardLayer.position.set(-pointer.sx * 10, -pointer.sy * 6);
    lightLayer.position.set(-pointer.sx * 10, -pointer.sy * 6);
    figureLayer.position.set(-pointer.sx * 22, -pointer.sy * 10);
    front.position.set(-pointer.sx * 30, -pointer.sy * 12);

    // Rain falls across the glass.
    for (const drop of drops) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * 0.18 * dt;
      if (drop.y > glass.y + glass.h) {
        drop.y = glass.y - drop.len - rand() * 60;
        drop.x = glass.x + rand() * (glass.w + 60);
      }
      drop.g.position.set(drop.x, drop.y);
    }

    // Lamp sway and flicker.
    lamp.rotation = Math.sin(time * 0.55) * 0.028 + Math.sin(time * 1.3) * 0.006;
    const flicker = 0.92 + Math.sin(time * 13) * 0.02 + (Math.random() < 0.012 ? -0.18 : 0);
    bulb.alpha = 0.95 * flicker;
    coneSprite.alpha = 0.13 * flicker;
    ambient.alpha = 0.16 * flicker;

    for (const mote of motes) {
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt + Math.sin(time * 0.6 + mote.phase) * 0.08;
      if (mote.x < 880) mote.x = 1440;
      if (mote.x > 1440) mote.x = 880;
      if (mote.y < 150) mote.y = 690;
      if (mote.y > 690) mote.y = 150;
      const axis = 1130 + Math.sin(lamp.rotation) * (mote.y - 140);
      const near = clamp(1 - Math.abs(mote.x - axis) / 320, 0, 1);
      mote.g.position.set(mote.x, mote.y);
      mote.g.alpha = (0.15 + near * 0.6) * (0.6 + Math.sin(time * 2 + mote.phase) * 0.4);
    }

    // The detective breathes, shifts his head, and lifts the glass now and then.
    const breath = Math.sin(time * 1.35);
    figure.torso.scale.y = 1 + breath * 0.005;
    figure.head.position.set(Math.sin(time * 0.37) * 3, -368 + breath * -1.6);
    figure.head.rotation = Math.sin(time * 0.29) * 0.02;
    armT += dt;
    if (armPhase === "down" && time > nextArm) {
      armPhase = "up";
      armT = 0;
    } else if (armPhase === "up") {
      const p = Math.min(1, armT / 1.3);
      figure.arm.rotation = ARM_DOWN - (ARM_DOWN - ARM_UP) * ease(p);
      if (p >= 1) {
        armPhase = "hold";
        armT = 0;
        api.pulse(5);
      }
    } else if (armPhase === "hold") {
      figure.glint.alpha = Math.max(0, Math.sin((armT / 2.4) * Math.PI)) * 0.9;
      if (armT > 2.4) {
        armPhase = "lower";
        armT = 0;
      }
    } else if (armPhase === "lower") {
      const p = Math.min(1, armT / 1.5);
      figure.arm.rotation = ARM_UP + (ARM_DOWN - ARM_UP) * ease(p);
      figure.glint.alpha = 0;
      if (p >= 1) {
        armPhase = "down";
        nextArm = time + 8 + rand() * 6;
      }
    }

    // Threads draw in, then sway.
    for (const thread of threads) {
      if (thread.delay > 0) thread.delay -= dt;
      else if (thread.progress < 1) thread.progress = Math.min(1, thread.progress + dt * 1.1);
    }
    drawThreads(time);
    drawSteam(time);

    // Pulses on pinned items.
    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const pulse = pulses[i];
      if (!pulse) continue;
      pulse.t += dt;
      const p = pulse.t / 1.2;
      const view = itemViews[pulse.index];
      const shine = view?.children[view.children.length - 1];
      if (shine) shine.alpha = Math.max(0, 0.32 * (1 - p));
      pulse.ring.scale.set(0.6 + p * 1.1);
      pulse.ring.alpha = Math.max(0, 0.9 * (1 - p));
      if (p >= 1) {
        pulse.ring.destroy();
        pulses.splice(i, 1);
      }
    }

    for (const [i, h] of haze.entries()) {
      h.x += (Math.sin(time * 0.05 + i) * 6 + 5) * dt;
      if (h.x > W + 500) h.x = -500;
    }

    // Lightning, then the flash fades.
    nextLightning -= dt;
    if (nextLightning <= 0) {
      strike();
      nextLightning = 11 + rand() * 12;
    }
    if (flashLevel > 0) {
      flashLevel = Math.max(0, flashLevel - dt * 2.6);
      const f = flashLevel > 0.7 ? 1 : flashLevel;
      flash.alpha = f * 0.75;
      roomFlash.alpha = f * 0.06;
    }
  });

  const fit = (): void => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    app.renderer.resize(w, h);
    const s = Math.max(w / W, h / H);
    world.scale.set(s);
    world.position.set((w - W * s) * focusX, (h - H * s) * focusY);
    if (reduced) render();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  fit();

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (reduced) return;
    if (visible) app.ticker.start();
    else app.ticker.stop();
  });
  io.observe(host);

  const pointerTarget = options.pointerTarget ?? host;
  const onPointer = (event: PointerEvent): void => {
    const box = host.getBoundingClientRect();
    if (box.width === 0) return;
    pointer.x = clamp(((event.clientX - box.left) / box.width) * 2 - 1, -1, 1);
    pointer.y = clamp(((event.clientY - box.top) / box.height) * 2 - 1, -1, 1);
  };
  const onLeave = (): void => {
    pointer.x = 0;
    pointer.y = 0;
  };
  pointerTarget.addEventListener("pointermove", onPointer);
  pointerTarget.addEventListener("pointerleave", onLeave);

  const api: HeroScene = {
    pulse(index) {
      const item = ITEMS[index];
      if (!item) return;
      if (reduced) return;
      const ring = new Graphics().circle(0, 0, Math.max(item.w, item.h) * 0.62).stroke({ width: 4, color: C.gold, alpha: 1 });
      ring.position.set(item.x, item.y);
      ring.blendMode = "add";
      ringLayer.addChild(ring);
      pulses.push({ index, t: 0, ring });
    },
    connect(a, b) {
      if (!ITEMS[a] || !ITEMS[b] || a === b) return;
      if (threads.some((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a))) {
        api.pulse(a);
        api.pulse(b);
        return;
      }
      const extra = threads.filter((t) => !t.base);
      if (extra.length >= 3) {
        const oldest = extra[0];
        if (oldest) threads.splice(threads.indexOf(oldest), 1);
      }
      threads.push({ a, b, progress: reduced ? 1 : 0, delay: 0, base: false });
      api.pulse(a);
      api.pulse(b);
      if (reduced) paintStill();
    },
    setReducedMotion(next) {
      reduced = next;
      if (reduced) {
        app.ticker.stop();
        paintStill();
      } else if (visible) {
        app.ticker.start();
      }
    },
    destroy() {
      ro.disconnect();
      io.disconnect();
      pointerTarget.removeEventListener("pointermove", onPointer);
      pointerTarget.removeEventListener("pointerleave", onLeave);
      app.ticker.stop();
      app.destroy(true, { children: true, texture: true, textureSource: true });
    },
  };

  if (reduced) {
    app.ticker.stop();
    paintStill();
  } else {
    // A lightning strike soon after load gives the room a first breath.
    nextLightning = 2.2 + rand() * 2;
  }
  return api;
}
