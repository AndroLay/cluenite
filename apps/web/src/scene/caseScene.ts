import { Application, Container, FillGradient, Graphics, Sprite, Texture } from "pixi.js";
import type { ClueStatus, QuickStage } from "../quickCase/viewModel";

// PixiJS renderer for the case room. The room is drawn in the same 600x200 design space the old
// SVG used, then scaled to cover its host box (the SVG's xMidYMid slice). Every position below is
// copied from that SVG, so the composition does not move. Text, clues, and controls stay in the DOM;
// this file only paints the room and the detective's pose.

export interface CaseScene {
  setStage(stage: QuickStage): void;
  setClues(statuses: readonly ClueStatus[]): void;
  destroy(): void;
}

const W = 600;
const H = 200;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// Old CSS timings: pose moves took 700ms and the lamp light 600ms, both ease-out-expo.
const POSE_SECONDS = 0.7;
const CONE_SECONDS = 0.6;

interface Pose {
  arm: number;
  head: number;
  partnerHead: number;
  cone: number;
}

const POSES: Record<QuickStage, Pose> = {
  observe: { arm: -28, head: -6, partnerHead: 0, cone: 0.8 },
  connect: { arm: 8, head: 4, partnerHead: 0, cone: 0.8 },
  challenge: { arm: -50, head: -9, partnerHead: 0, cone: 0.8 },
  reveal: { arm: -14, head: -2, partnerHead: -7, cone: 1 },
};

// Same family as --ease-out-expo (cubic-bezier(0.16, 1, 0.3, 1)); the exponential is close enough.
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

// A value that eases toward a target. Duration 0 snaps, which is how reduced motion skips a move.
class Tween {
  value: number;
  private from: number;
  private to: number;
  private start = 0;
  private duration = 0;

  constructor(value: number) {
    this.value = value;
    this.from = value;
    this.to = value;
  }

  go(target: number, now: number, duration: number): void {
    this.from = this.value;
    this.to = target;
    this.start = now;
    this.duration = duration;
  }

  update(now: number): void {
    const p = this.duration <= 0 ? 1 : easeOutExpo(clamp01((now - this.start) / this.duration));
    this.value = lerp(this.from, this.to, p);
  }
}

// Rain streak offsets inside one 30x60 tile, copied from the old pattern.
const RAIN_STREAKS: ReadonlyArray<readonly [number, number]> = [
  [5, 4],
  [20, 18],
  [12, 36],
  [26, 44],
];

// Glass area of the window, in design units.
const GLASS = { x0: 40, y0: 26, x1: 160, y1: 138 };

// Liang-Barsky clip of one streak to the glass, so rain never spills past the window frame.
function clipToGlass(x0: number, y0: number, x1: number, y1: number): [number, number, number, number] | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const edges: ReadonlyArray<readonly [number, number]> = [
    [-dx, x0 - GLASS.x0],
    [dx, GLASS.x1 - x0],
    [-dy, y0 - GLASS.y0],
    [dy, GLASS.y1 - y0],
  ];
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      t0 = Math.max(t0, r);
    } else {
      if (r < t0) return null;
      t1 = Math.min(t1, r);
    }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}

// A round light falloff drawn to a canvas. Used for the pool of light on the floor.
function radialGlow(stops: Array<[number, string]>): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

interface RoomRefs {
  rain: Graphics;
  coneWrap: Container;
  cone: Graphics;
  minuteHand: Graphics;
  hourHand: Graphics;
}

// Wall, floor, window, gallery, clock, and lamp. Draw order matches the old SVG.
function buildRoom(root: Container): RoomRefs {
  // Wall and floor
  root.addChild(
    new Graphics().rect(0, 0, W, 150).fill(
      new FillGradient({
        end: { x: 0, y: 1 },
        colorStops: [
          { offset: 0, color: "#1d3449" },
          { offset: 1, color: "#132334" },
        ],
      }),
    ),
  );
  root.addChild(new Graphics().rect(0, 146, W, 5).fill(0x223748));
  root.addChild(new Graphics().rect(0, 151, W, H - 151).fill(0x0c1826));

  const floorLines = new Graphics();
  for (const x of [-100, 60, 200, 400, 540, 700]) {
    floorLines.moveTo(300, 151).lineTo(x, H);
  }
  floorLines.stroke({ width: 1, color: 0x1b3145 });
  root.addChild(floorLines);

  // Light on the floor: a warm pool under the lamp, a cool spill from the window
  const pool = new Sprite(
    radialGlow([
      [0, "rgba(245, 190, 112, 0.22)"],
      [1, "rgba(245, 190, 112, 0)"],
    ]),
  );
  pool.anchor.set(0.5);
  pool.position.set(300, 182);
  pool.width = 360;
  pool.height = 48;
  root.addChild(pool);

  root.addChild(
    new Graphics()
      .poly([40, 144, 160, 144, 232, H, -32, H])
      .fill(
        new FillGradient({
          end: { x: 0, y: 1 },
          colorStops: [
            { offset: 0, color: "rgba(184, 170, 245, 0.14)" },
            { offset: 1, color: "rgba(184, 170, 245, 0)" },
          ],
        }),
      ),
  );

  // Window: dark glass, moon, rain, mullions, sill, and frame
  root.addChild(new Graphics().rect(40, 26, 120, 112).fill(0x0a1622));
  root.addChild(new Graphics().circle(136, 52, 8).fill({ color: 0xf4f0e6, alpha: 0.7 }));
  const rain = new Graphics();
  root.addChild(rain);
  root.addChild(
    new Graphics()
      .moveTo(100, 26)
      .lineTo(100, 138)
      .moveTo(40, 82)
      .lineTo(160, 82)
      .stroke({ width: 3, color: 0x4e6a82 }),
  );
  root.addChild(new Graphics().rect(32, 138, 136, 6).fill(0x2c4256));
  root.addChild(new Graphics().rect(40, 26, 120, 112).stroke({ width: 3, color: 0x4e6a82 }));

  // Gallery frames. The second one hangs slightly crooked.
  root.addChild(new Graphics().rect(430, 30, 62, 44).fill(0x0e1c2b));
  root.addChild(new Graphics().rect(430, 30, 62, 44).stroke({ width: 2.5, color: 0xf5be70 }));
  root.addChild(new Graphics().rect(438, 38, 46, 28).fill(0x223748));
  root.addChild(
    new Graphics().poly([440, 62, 456, 46, 470, 58, 482, 48, 482, 64]).fill({ color: 0x75d7bd, alpha: 0.45 }),
  );

  const crooked = new Container();
  crooked.position.set(526, 66);
  crooked.rotation = -4 * DEG;
  crooked.addChild(new Graphics().rect(-18, -16, 38, 30).fill(0x0e1c2b));
  crooked.addChild(new Graphics().rect(-18, -16, 38, 30).stroke({ width: 2, color: 0xf5be70 }));
  crooked.addChild(new Graphics().rect(-12, -10, 26, 18).fill({ color: 0xb8aaf5, alpha: 0.35 }));
  root.addChild(crooked);

  // Wall clock: the hands turn slowly, and reveal stops them
  const clock = new Container();
  clock.position.set(372, 62);
  clock.addChild(new Graphics().circle(0, 0, 14).fill(0x0e1c2b));
  clock.addChild(new Graphics().circle(0, 0, 14).stroke({ width: 2, color: 0xf5be70 }));
  const hourHand = new Graphics().moveTo(0, 0).lineTo(0, -8).stroke({ width: 2, color: 0xf4f0e6, cap: "round" });
  const minuteHand = new Graphics()
    .moveTo(0, 0)
    .lineTo(8, -6)
    .stroke({ width: 1.4, color: 0xf4f0e6, cap: "round" });
  clock.addChild(hourHand);
  clock.addChild(minuteHand);
  clock.addChild(new Graphics().circle(0, 0, 1.6).fill(0xf5be70));
  root.addChild(clock);

  // Lamp and its light cone. The cone is a triangle, so its gradient fills the shape's bounds.
  const coneWrap = new Container();
  const cone = new Graphics().poly([300, 52, 160, H, 440, H]).fill(
    new FillGradient({
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: "rgba(245, 190, 112, 0.4)" },
        { offset: 1, color: "rgba(245, 190, 112, 0)" },
      ],
    }),
  );
  coneWrap.addChild(cone);
  root.addChild(coneWrap);
  root.addChild(new Graphics().moveTo(300, 0).lineTo(300, 28).stroke({ width: 2, color: 0x4e6a82 }));
  root.addChild(new Graphics().poly([282, 30, 318, 30, 330, 48, 270, 48]).fill(0x2c4256));
  root.addChild(new Graphics().circle(300, 50, 5).fill(0xf5be70));

  return { rain, coneWrap, cone, minuteHand, hourHand };
}

interface Mote {
  g: Graphics;
  period: number;
  delay: number;
}

interface Characters {
  partnerBody: Container;
  partnerHead: Container;
  detectiveBody: Container;
  detectiveHead: Container;
  arm: Container;
  motes: Mote[];
  flash: Graphics;
  chips: ChipRef[];
  thread: Graphics;
}

const PARTNER_FILL = 0x0f2033;
const SILHOUETTE = 0x0a1420;
const OUTLINE = 0x2c4256;
const PAPER = 0xf4f0e6;
const AMBER = 0xf5be70;
const TEAL = 0x75d7bd;
const LILAC = 0xb8aaf5;

// Dust motes: position, radius, one leg of the drift in seconds, and how far into it each one starts.
const MOTES = [
  { x: 236, y: 78, r: 1.4, period: 9, delay: 0 },
  { x: 290, y: 118, r: 1.1, period: 11, delay: 3 },
  { x: 352, y: 96, r: 1.3, period: 8, delay: 5 },
  { x: 262, y: 150, r: 1, period: 12, delay: 7 },
];

// Case files on the table in front of the partner, in clue order (CAM, ACCESS, SCHEDULE in the preview).
const CHIPS = [
  { x: 102, y: 159, rot: -6, w: 36 },
  { x: 141, y: 155, rot: 4, w: 34 },
  { x: 179, y: 161, rot: -2, w: 30 },
];
const CHIP_DIM = 0x1d3145; // a locked file: a dark slip, readable only as a shape
const SLIP_INK = 0x14202e;
const CHIP_SECONDS = 0.35;

// The partner's outline, traced once for the fill and once for the stroke.
function partnerBodyPath(): Graphics {
  return new Graphics()
    .moveTo(-16, 0)
    .lineTo(-14, -52)
    .quadraticCurveTo(-12, -68, 0, -70)
    .quadraticCurveTo(12, -68, 14, -52)
    .lineTo(16, 0)
    .lineTo(-16, 0);
}

// One case file. Locked shows only the dark slip; unlocked fades the paper in; linked adds a teal strip
// and lifts the file a few pixels. Each layer is a container so its alpha can be tweened.
interface ChipRef {
  x: number;
  y: number;
  root: Container;
  paper: Container;
  strip: Container;
  paperT: Tween;
  stripT: Tween;
  liftT: Tween;
}

function buildChips(root: Container): ChipRef[] {
  return CHIPS.map((chip) => {
    const half = chip.w / 2;
    const c = new Container();
    c.position.set(chip.x, chip.y);
    c.rotation = chip.rot * DEG;
    c.addChild(new Graphics().rect(-half, -7, chip.w, 14).fill({ color: CHIP_DIM, alpha: 0.9 }));
    c.addChild(new Graphics().rect(-half, -7, chip.w, 14).stroke({ width: 1, color: OUTLINE }));

    const paper = new Container();
    paper.alpha = 0;
    paper.addChild(new Graphics().rect(-half, -7, chip.w, 14).fill({ color: PAPER, alpha: 0.92 }));
    paper.addChild(
      new Graphics()
        .rect(-half + 4, -2, chip.w - 8, 1)
        .fill({ color: SLIP_INK, alpha: 0.45 })
        .rect(-half + 4, 2, chip.w - 14, 1)
        .fill({ color: SLIP_INK, alpha: 0.45 }),
    );
    c.addChild(paper);

    const strip = new Container();
    strip.alpha = 0;
    strip.addChild(new Graphics().rect(-half, -7, chip.w, 2).fill({ color: TEAL }));
    c.addChild(strip);

    root.addChild(c);
    return {
      x: chip.x,
      y: chip.y,
      root: c,
      paper,
      strip,
      paperT: new Tween(0),
      stripT: new Tween(0),
      liftT: new Tween(0),
    };
  });
}

// A teal thread through the linked files, arcing above them. Redrawn whenever the linked set changes.
function drawThread(g: Graphics, linked: ChipRef[]): void {
  g.clear();
  const [first, ...rest] = linked;
  if (!first) return;
  g.moveTo(first.x, first.y - 8);
  let prev = first;
  for (const chip of rest) {
    g.quadraticCurveTo((prev.x + chip.x) / 2, Math.min(prev.y, chip.y) - 22, chip.x, chip.y - 8);
    prev = chip;
  }
  g.stroke({ width: 1.5, color: TEAL, cap: "round" });
}

// The partner sits across the table; the detective leans in from the right with a magnifier.
// Body and neck are placed at their breathing origins, so their children use local coordinates.
function buildCharacters(root: Container): Characters {
  const partnerBody = new Container();
  partnerBody.position.set(262, 180);
  partnerBody.addChild(partnerBodyPath().fill(PARTNER_FILL));
  partnerBody.addChild(partnerBodyPath().stroke({ width: 1, color: OUTLINE }));
  partnerBody.addChild(new Graphics().rect(-5, -76, 10, 9).fill(PARTNER_FILL));
  root.addChild(partnerBody);

  // The head pivots at the neck; reveal turns it.
  const partnerHead = new Container();
  partnerHead.position.set(262, 110);
  partnerHead.addChild(new Graphics().circle(0, -12, 10.5).fill(PARTNER_FILL));
  partnerHead.addChild(new Graphics().circle(0, -12, 10.5).stroke({ width: 1, color: OUTLINE }));
  root.addChild(partnerHead);

  root.addChild(new Graphics().roundRect(70, 170, 170, 8, 2).fill(SILHOUETTE));
  const chips = buildChips(root);
  // The thread sits over the files it joins, so it is added after them.
  const thread = new Graphics();
  thread.alpha = 0;
  root.addChild(thread);

  const detectiveBody = new Container();
  detectiveBody.position.set(477, 200);
  detectiveBody.addChild(
    new Graphics()
      .moveTo(-29, 0)
      .lineTo(-25, -54)
      .quadraticCurveTo(-19, -76, -1, -78)
      .quadraticCurveTo(17, -76, 23, -54)
      .lineTo(29, 0)
      .lineTo(-29, 0)
      .fill(SILHOUETTE),
  );
  detectiveBody.addChild(new Graphics().rect(-6, -88, 12, 14).fill(SILHOUETTE));
  root.addChild(detectiveBody);

  // Head pivots at the neck; the brim and hat are drawn in the same local space.
  const detectiveHead = new Container();
  detectiveHead.position.set(477, 110);
  detectiveHead.addChild(new Graphics().circle(0, -4, 13).fill(SILHOUETTE));
  detectiveHead.addChild(new Graphics().poly([-21, -12, 21, -12, 17, -8, -17, -8]).fill(SILHOUETTE));
  detectiveHead.addChild(
    new Graphics().moveTo(-11, -12).quadraticCurveTo(0, -30, 11, -12).lineTo(-11, -12).fill(SILHOUETTE),
  );
  root.addChild(detectiveHead);

  // Arm and magnifier. The pivot is the shoulder; observe, connect, challenge, and reveal rotate it.
  const arm = new Container();
  arm.position.set(470, 130);
  arm.addChild(new Graphics().moveTo(0, 0).lineTo(54, -12).stroke({ width: 7, color: SILHOUETTE, cap: "round" }));
  arm.addChild(new Graphics().circle(60, -20, 8).stroke({ width: 2.5, color: AMBER }));
  arm.addChild(new Graphics().moveTo(66, -14).lineTo(76, -4).stroke({ width: 3, color: AMBER, cap: "round" }));
  root.addChild(arm);

  const motes: Mote[] = MOTES.map((m) => {
    const g = new Graphics().circle(m.x, m.y, m.r).fill(PAPER);
    root.addChild(g);
    return { g, period: m.period, delay: m.delay };
  });

  // Lightning: a full-room lilac wash whose alpha the update loop drives during reveal.
  const flash = new Graphics().rect(0, 0, W, H).fill(LILAC);
  flash.alpha = 0;
  root.addChild(flash);

  return { partnerBody, partnerHead, detectiveBody, detectiveHead, arm, motes, flash, chips, thread };
}

// Lamp flicker: a 7s steps() cycle with two short dips, at 40% and 71% of the cycle.
function flickerAlpha(t: number): number {
  const p = (t % 7) / 7;
  if (p >= 0.4 && p < 0.42) return 0.6;
  if (p >= 0.71 && p < 0.73) return 0.9;
  return 1;
}

// Lightning keyframes over 1.8s after a 0.3s delay. Linear between points, as the old CSS was.
const LIGHTNING: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.04, 0.5],
  [0.09, 0.1],
  [0.16, 0.38],
  [0.3, 0],
  [1, 0],
];
const LIGHTNING_DELAY = 0.3;
const LIGHTNING_SECONDS = 1.8;

// Flash opacity `since` seconds after the reveal stage began.
function lightningAlpha(since: number): number {
  const local = since - LIGHTNING_DELAY;
  if (local <= 0) return 0;
  const p = Math.min(1, local / LIGHTNING_SECONDS);
  let prev: readonly [number, number] = [0, 0];
  for (const key of LIGHTNING) {
    const [t1, a1] = key;
    if (p <= t1) {
      const [t0, a0] = prev;
      const span = t1 - t0;
      return span > 0 ? lerp(a0, a1, (p - t0) / span) : a1;
    }
    prev = key;
  }
  return 0;
}

// Breathing: a smooth wave between 1 and 1.012 vertical scale, one cycle per `period` seconds.
function breathe(t: number, period: number): number {
  return 1 + 0.012 * (0.5 - 0.5 * Math.cos((TAU * t) / period));
}

// Dust drift: ping-pongs between the start and the end point, one leg per `period` seconds.
function moteDrift(elapsed: number, period: number): number {
  const cycle = (((elapsed / period) % 2) + 2) % 2; // negative delays start partway through a leg
  return smooth(cycle <= 1 ? cycle : 2 - cycle);
}

// Rain: the old pattern's four streaks per 30x60 tile, redrawn at vertical offset `dy` and clipped
// to the glass. The old SVG never showed them because its pattern had no stroke, so they are drawn here.
function drawRain(g: Graphics, dy: number): void {
  g.clear();
  for (let tx = 1; tx <= 5; tx += 1) {
    for (let ty = -2; ty <= 3; ty += 1) {
      for (const [sx, sy] of RAIN_STREAKS) {
        const x = tx * 30 + sx;
        const y = ty * 60 + sy + dy;
        const seg = clipToGlass(x, y, x - 3, y + 8);
        if (seg) g.moveTo(seg[0], seg[1]).lineTo(seg[2], seg[3]);
      }
    }
  }
  g.stroke({ width: 1, color: 0xb7c6d3, alpha: 0.3 });
}

// Mounts the room into `host` and returns a handle. Motion runs on the Pixi ticker; with
// prefers-reduced-motion the ticker stays stopped and the scene is painted once per change.
export async function createCaseScene(host: HTMLElement, initial: QuickStage): Promise<CaseScene> {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  const canvas = app.canvas;
  host.appendChild(canvas);

  // The design space is 600x200. `world` is scaled to cover the host box, as the SVG's slice did.
  const world = new Container();
  app.stage.addChild(world);
  const room = buildRoom(world);
  const people = buildCharacters(world);
  const chips = people.chips;
  const threadT = new Tween(0);

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;

  let stage: QuickStage = initial;
  let revealAt: number | null = null; // scene time when reveal began; drives the lightning
  let elapsed = 0; // seconds of scene time, advanced by the ticker
  let clock = 0; // wall-clock seconds for the hands; frozen during reveal

  const first = POSES[initial];
  const armT = new Tween(first.arm);
  const headT = new Tween(first.head);
  const partnerT = new Tween(first.partnerHead);
  const lampT = new Tween(first.cone);

  const aim = (next: QuickStage, instant: boolean): void => {
    const pose = POSES[next];
    const seconds = instant ? 0 : POSE_SECONDS;
    armT.go(pose.arm, elapsed, seconds);
    headT.go(pose.head, elapsed, seconds);
    partnerT.go(pose.partnerHead, elapsed, seconds);
    lampT.go(pose.cone, elapsed, instant ? 0 : CONE_SECONDS);
  };

  // Paints one frame from the current state. Under reduced motion the time is pinned to 0, so the
  // breathing, flicker, drift, rain, and flash all rest at their starting values.
  const paint = (): void => {
    armT.update(elapsed);
    headT.update(elapsed);
    partnerT.update(elapsed);
    lampT.update(elapsed);

    people.arm.rotation = armT.value * DEG;
    people.detectiveHead.rotation = headT.value * DEG;
    people.partnerHead.rotation = partnerT.value * DEG;
    room.coneWrap.alpha = lampT.value;
    room.cone.alpha = reduced ? 1 : flickerAlpha(elapsed);

    room.minuteHand.rotation = (clock / 60) * TAU;
    room.hourHand.rotation = (clock / 720) * TAU;

    const t = reduced ? 0 : elapsed;
    drawRain(room.rain, ((t % 1.1) / 1.1) * 60);
    people.detectiveBody.scale.y = breathe(t, 5);
    people.partnerBody.scale.y = breathe(t, 6);
    for (const m of people.motes) {
      const e = moteDrift(t + m.delay, m.period);
      m.g.position.set(14 * e, -20 * e);
      m.g.alpha = lerp(0.2, 0.9, e);
    }
    people.flash.alpha = !reduced && revealAt !== null ? lightningAlpha(elapsed - revealAt) : 0;

    for (const chip of chips) {
      chip.paperT.update(elapsed);
      chip.stripT.update(elapsed);
      chip.liftT.update(elapsed);
      chip.paper.alpha = chip.paperT.value;
      chip.strip.alpha = chip.stripT.value;
      chip.root.position.y = chip.y + chip.liftT.value;
    }
    threadT.update(elapsed);
    people.thread.alpha = threadT.value;
  };

  app.ticker.add(() => {
    const dt = app.ticker.deltaMS / 1000;
    elapsed += dt;
    if (stage !== "reveal") clock += dt;
    paint();
  });

  const fit = (): void => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    app.renderer.resize(w, h);
    const s = Math.max(w / W, h / H);
    world.scale.set(s);
    world.position.set((w - W * s) / 2, (h - H * s) / 2);
    if (reduced) {
      paint();
      app.render();
    }
  };

  const onMotionChange = (): void => {
    reduced = motionQuery.matches;
    if (reduced) {
      app.ticker.stop();
      aim(stage, true);
      paint();
      app.render();
    } else {
      app.ticker.start();
    }
  };
  motionQuery.addEventListener("change", onMotionChange);
  if (reduced) app.ticker.stop();

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  fit();

  return {
    setStage(next: QuickStage): void {
      stage = next;
      revealAt = next === "reveal" ? (revealAt ?? elapsed) : null;
      aim(next, reduced);
      if (reduced) {
        paint();
        app.render();
      }
    },
    setClues(statuses: readonly ClueStatus[]): void {
      const seconds = reduced ? 0 : CHIP_SECONDS;
      const linked: ChipRef[] = [];
      chips.forEach((chip, i) => {
        const status = statuses[i] ?? "locked";
        chip.paperT.go(status === "locked" ? 0 : 1, elapsed, seconds);
        chip.stripT.go(status === "linked" ? 1 : 0, elapsed, seconds);
        chip.liftT.go(status === "locked" ? 0 : -3, elapsed, seconds);
        if (status === "linked") linked.push(chip);
      });
      drawThread(people.thread, linked);
      threadT.go(linked.length >= 2 ? 0.9 : 0, elapsed, seconds);
      if (reduced) {
        paint();
        app.render();
      }
    },
    destroy(): void {
      ro.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      app.destroy(true, { children: true, texture: true, textureSource: true });
      canvas.remove();
    },
  };
}
