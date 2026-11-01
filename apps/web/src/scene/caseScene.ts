import { Application, Assets, Container, FillGradient, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import type { ClueStatus, QuickStage } from "../quickCase/viewModel";
import galleryUrl from "../assets/quick-case/museum-gallery.jpg";

// PixiJS renderer for the case room. The room is a painted still (museum-gallery.jpg) in a 600x250 design
// space, scaled to cover its host box. The table, files, and figures are drawn over it and sit
// FOREGROUND_DROP units lower. Text, clues, and controls stay in the DOM. This file paints the room
// light, the detective's pose, and the case files, which also take a pointer tap to inspect the clue.

export interface CaseScene {
  setStage(stage: QuickStage): void;
  setClues(statuses: readonly ClueStatus[]): void;
  setInspectable(flags: readonly boolean[]): void;
  // A short scale kick for a rejected command. Ignored under prefers-reduced-motion.
  jolt(): void;
  destroy(): void;
}

const W = 600;
const H = 250;
// Table, files, pool of light, and figures move down by this much from the 200-unit layout.
const FOREGROUND_DROP = 40;
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
  coneWrap: Container;
  cone: Graphics;
}

// The still is a 1344x756 painted gallery: a lit vitrine left of centre, gilt frames, parquet, and a
// bench at the lower left. It is scaled to the design width, then shifted up by STILL_TOP so the
// vitrine's base sits just behind the table and the top of its crown leaves the frame.
const STILL_TOP = -65;
// Where the vitrine's inner light falls in design units, and where the lamp cone starts.
const VITRINE_X = 183;
const VITRINE_LIGHT_Y = 4;

// The painted room, then the light that sits on it. Draw order: still, floor pool, cone.
function buildRoom(root: Container, gallery: Texture): RoomRefs {
  const still = new Sprite(gallery);
  still.width = W;
  still.height = (gallery.height / gallery.width) * W;
  still.position.set(0, STILL_TOP);
  root.addChild(still);

  // Light on the floor: a warm pool under the vitrine, on the parquet in front of the table
  const pool = new Sprite(
    radialGlow([
      [0, "rgba(217, 182, 129, 0.22)"],
      [1, "rgba(217, 182, 129, 0)"],
    ]),
  );
  pool.anchor.set(0.5);
  pool.position.set(VITRINE_X, 186 + FOREGROUND_DROP);
  pool.width = 260;
  pool.height = 44;
  root.addChild(pool);

  // Light cone from the vitrine's inner lamp down onto the table. It is a triangle, so its gradient
  // fills the shape's bounds. The fixture is in the still, so no lamp is drawn here.
  const coneWrap = new Container();
  const cone = new Graphics().poly([VITRINE_X, VITRINE_LIGHT_Y, VITRINE_X - 92, H, VITRINE_X + 92, H]).fill(
    new FillGradient({
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: "rgba(217, 182, 129, 0.4)" },
        { offset: 1, color: "rgba(217, 182, 129, 0)" },
      ],
    }),
  );
  coneWrap.addChild(cone);
  root.addChild(coneWrap);

  return { coneWrap, cone };
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

const PARTNER_FILL = 0x1a120c;
const SILHOUETTE = 0x0b0907;
const OUTLINE = 0x65432d;
const PAPER = 0xe9decb;
const AMBER = 0xd9b681;
const TEAL = 0xc79a62;
const LILAC = 0xbfb19a;

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
const CHIP_DIM = 0x2c2018; // a locked file: a dark slip, readable only as a shape
const SLIP_INK = 0x211811;
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

// One case file. Locked shows only the dark slip; unlocked fades the paper in; linked adds a brass strip
// and lifts the file a few pixels. Each layer is a container so its alpha can be tweened.
interface ChipRef {
  x: number;
  y: number;
  root: Container;
  ring: Graphics;
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

    // Hover ring and tap target. The hit area lives in the file's own space, so it turns with the file.
    const ring = new Graphics().rect(-half - 3, -10, chip.w + 6, 20).stroke({ width: 1.5, color: AMBER });
    ring.visible = false;
    c.addChild(ring);
    c.hitArea = new Rectangle(-half - 4, -11, chip.w + 8, 22);
    c.eventMode = "none";

    root.addChild(c);
    return {
      x: chip.x,
      y: chip.y,
      root: c,
      ring,
      paper,
      strip,
      paperT: new Tween(0),
      stripT: new Tween(0),
      liftT: new Tween(0),
    };
  });
}

const ARC_STEPS = 14;

// A brass thread through the linked files, arcing above them. `progress` (0 to 1) draws it out along the
// arcs, so a new link pulls the thread across and an unlink pulls it back. A bright tip shows mid-draw.
function drawThread(g: Graphics, linked: ChipRef[], progress: number): void {
  g.clear();
  const first = linked[0];
  if (linked.length < 2 || !first || progress <= 0) return;
  const pts: Array<[number, number]> = [[first.x, first.y - 8]];
  for (let i = 1; i < linked.length; i++) {
    const prev = linked[i - 1];
    const chip = linked[i];
    if (!prev || !chip) continue;
    const x0 = prev.x;
    const y0 = prev.y - 8;
    const cx = (prev.x + chip.x) / 2;
    const cy = Math.min(prev.y, chip.y) - 22;
    const x2 = chip.x;
    const y2 = chip.y - 8;
    for (let s = 1; s <= ARC_STEPS; s++) {
      const t = s / ARC_STEPS;
      const u = 1 - t;
      pts.push([u * u * x0 + 2 * u * t * cx + t * t * x2, u * u * y0 + 2 * u * t * cy + t * t * y2]);
    }
  }
  const last = Math.round(clamp01(progress) * (pts.length - 1));
  const tip = pts[last];
  if (last < 1 || !tip) return;
  g.moveTo(first.x, first.y - 8);
  for (let i = 1; i <= last; i++) {
    const p = pts[i];
    if (p) g.lineTo(p[0], p[1]);
  }
  g.stroke({ width: 1.5, color: TEAL, cap: "round", join: "round" });
  if (progress < 1) g.circle(tip[0], tip[1], 1.6).fill({ color: AMBER });
}

// The partner sits across the table; the detective leans in from the right with a magnifier.
// Body and neck are placed at their breathing origins, so their children use local coordinates.
// `root` is the foreground layer; motes and the lightning wash go to `world` so they stay in the room.
function buildCharacters(root: Container, world: Container): Characters {
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
  root.addChild(thread);

  const detectiveBody = new Container();
  detectiveBody.position.set(477, 200);
  // A thin warm rim keeps the dark silhouette readable against the dark wall.
  const detectiveBodyPath = () =>
    new Graphics()
      .moveTo(-29, 0)
      .lineTo(-25, -54)
      .quadraticCurveTo(-19, -76, -1, -78)
      .quadraticCurveTo(17, -76, 23, -54)
      .lineTo(29, 0)
      .lineTo(-29, 0);
  detectiveBody.addChild(detectiveBodyPath().fill(SILHOUETTE));
  detectiveBody.addChild(detectiveBodyPath().stroke({ width: 1.2, color: AMBER, alpha: 0.5 }));
  detectiveBody.addChild(new Graphics().rect(-6, -88, 12, 14).fill(SILHOUETTE));
  root.addChild(detectiveBody);

  // Head pivots at the neck; the brim and hat are drawn in the same local space.
  const detectiveHead = new Container();
  detectiveHead.position.set(477, 110);
  detectiveHead.addChild(new Graphics().circle(0, -4, 13).fill(SILHOUETTE));
  detectiveHead.addChild(new Graphics().circle(0, -4, 13).stroke({ width: 1.2, color: AMBER, alpha: 0.5 }));
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
    world.addChild(g);
    return { g, period: m.period, delay: m.delay };
  });

  // Lightning: a full-room pale wash whose alpha the update loop drives during reveal.
  const flash = new Graphics().rect(0, 0, W, H).fill(LILAC);
  flash.alpha = 0;
  world.addChild(flash);

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

function within(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Higher rank = further along. A file that rises in rank is the one the camera pushes toward.
const CLUE_RANK: Record<ClueStatus, number> = { locked: 0, unlocked: 1, linked: 2 };
const PUSH_ZOOM = 0.3;
const PUSH_RISE = 0.9; // seconds for the camera to reach the new file
const PUSH_HOLD = 3; // scene seconds when the camera starts to ease back
const PUSH_RETURN = 4.2; // scene seconds when the camera is back at full room
const KICK_SECONDS = 0.5;

// Camera push after evidence opens or links: rise, hold on the file, then ease back to the full room.
function pushAmount(since: number): number {
  if (since < 0 || since >= PUSH_RETURN) return 0;
  if (since < PUSH_RISE) return smooth(clamp01(since / PUSH_RISE));
  if (since < PUSH_HOLD) return 1;
  return 1 - smooth(clamp01((since - PUSH_HOLD) / (PUSH_RETURN - PUSH_HOLD)));
}

// A short scale kick after a rejected command: full strength at the start, decaying to nothing.
function kickAmount(since: number): number {
  if (since < 0 || since >= KICK_SECONDS) return 0;
  const k = 1 - since / KICK_SECONDS;
  return k * k;
}

// Dust drift: ping-pongs between the start and the end point, one leg per `period` seconds.
function moteDrift(elapsed: number, period: number): number {
  const cycle = (((elapsed / period) % 2) + 2) % 2; // negative delays start partway through a leg
  return smooth(cycle <= 1 ? cycle : 2 - cycle);
}

// Mounts the room into `host` and returns a handle. Motion runs on the Pixi ticker; with
// prefers-reduced-motion the ticker stays stopped and the scene is painted once per change.
export async function createCaseScene(
  host: HTMLElement,
  initial: QuickStage,
  onPick?: (index: number) => void,
): Promise<CaseScene> {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  const canvas = app.canvas;
  host.appendChild(canvas);

  // The design space is 600x250. `world` is scaled to cover the host box. The table, files, pool, and
  // figures sit in `foreground`, shifted down, so the room behind them keeps its height.
  const world = new Container();
  app.stage.addChild(world);
  const gallery = await Assets.load<Texture>(galleryUrl);
  // `camera` holds the room and the table, so it can push in and kick. Motes and the lightning wash stay on
  // `world`, above it, so they keep their place in the frame.
  const camera = new Container();
  world.addChild(camera);
  const room = buildRoom(camera, gallery);
  const foreground = new Container();
  foreground.position.set(0, FOREGROUND_DROP);
  camera.addChild(foreground);
  const people = buildCharacters(foreground, world);
  const chips = people.chips;
  const threadT = new Tween(0);
  let threadChips: ChipRef[] = []; // the last linked set of two or more; kept so an unlink can retract it
  let threadDirty = true;
  let threadDrawn = -1;

  // Camera state. The push is driven by clue status changes from the server (see setClues), never by local
  // previews. `pushFocus` is in design space, below the foreground drop. Reduced motion never sets these.
  let pushAt: number | null = null;
  let pushFocus = { x: W / 2, y: H / 2 };
  let kickAt: number | null = null;
  let known: readonly ClueStatus[] = []; // statuses at the last sync, to see which files just opened
  const hovered = chips.map(() => false);

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;

  let stage: QuickStage = initial;
  let revealAt: number | null = null; // scene time when reveal began; drives the lightning
  let elapsed = 0; // seconds of scene time, advanced by the ticker

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
  // breathing, flicker, drift, and flash all rest at their starting values.
  const paint = (): void => {
    armT.update(elapsed);
    headT.update(elapsed);
    partnerT.update(elapsed);
    lampT.update(elapsed);

    // Camera: the push eases toward the newest file, the kick scales the room briefly. The pivot is clamped so
    // the visible window never leaves the design rectangle, which keeps the edges of the room covered.
    const push = pushAt === null ? 0 : pushAmount(elapsed - pushAt);
    const kick = kickAt === null ? 0 : kickAmount(elapsed - kickAt);
    const zoom = 1 + PUSH_ZOOM * push + 0.04 * kick;
    camera.scale.set(zoom);
    camera.pivot.set(
      within(lerp(W / 2, pushFocus.x, push), W / (2 * zoom), W - W / (2 * zoom)),
      within(lerp(H / 2, pushFocus.y, push), H / (2 * zoom), H - H / (2 * zoom)),
    );
    camera.position.set(W / 2, H / 2);

    people.arm.rotation = armT.value * DEG;
    people.detectiveHead.rotation = headT.value * DEG;
    people.partnerHead.rotation = partnerT.value * DEG;
    room.coneWrap.alpha = lampT.value;
    room.cone.alpha = reduced ? 1 : flickerAlpha(elapsed);

    const t = reduced ? 0 : elapsed;
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
    // Hotspots: an inspectable file pulses its amber ring slowly; hover holds it at full strength.
    const pulse = 0.5 + 0.5 * Math.sin((TAU * (reduced ? 0 : elapsed)) / 2.4);
    chips.forEach((chip, i) => {
      const on = pickable[i] === true;
      chip.ring.visible = on;
      chip.ring.alpha = hovered[i] === true ? 1 : on ? 0.4 + 0.35 * pulse : 0;
    });

    threadT.update(elapsed);
    if (threadDirty || Math.abs(threadT.value - threadDrawn) > 0.002) {
      drawThread(people.thread, threadChips, threadT.value);
      threadDrawn = threadT.value;
      threadDirty = false;
    }
  };

  app.ticker.add(() => {
    const dt = app.ticker.deltaMS / 1000;
    elapsed += dt;
    paint();
  });

  // Case files take a tap when the clue behind them can be inspected. Hover shows the amber ring. A tap
  // calls the same handler as the clue's inspect button, so the scene adds no second path to the game.
  const pickable = chips.map(() => false);
  chips.forEach((chip, i) => {
    chip.root.on("pointerover", () => {
      hovered[i] = true;
      if (reduced) {
        paint();
        app.render();
      }
    });
    chip.root.on("pointerout", () => {
      hovered[i] = false;
      if (reduced) {
        paint();
        app.render();
      }
    });
    chip.root.on("pointertap", () => {
      if (pickable[i] === true) onPick?.(i);
    });
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
      pushAt = null;
      kickAt = null;
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
      const opened: ChipRef[] = [];
      chips.forEach((chip, i) => {
        const status = statuses[i] ?? "locked";
        // The first non-empty sync is the state on load, so it does not push the camera.
        if (known.length > 0 && CLUE_RANK[status] > CLUE_RANK[known[i] ?? "locked"]) opened.push(chip);
        chip.paperT.go(status === "locked" ? 0 : 1, elapsed, seconds);
        chip.stripT.go(status === "linked" ? 1 : 0, elapsed, seconds);
        chip.liftT.go(status === "locked" ? 0 : -3, elapsed, seconds);
        if (status === "linked") linked.push(chip);
      });
      known = [...statuses];
      if (opened.length > 0 && !reduced) {
        const n = opened.length;
        pushFocus = {
          x: opened.reduce((sum, c) => sum + c.x, 0) / n,
          y: opened.reduce((sum, c) => sum + c.y, 0) / n + FOREGROUND_DROP,
        };
        pushAt = elapsed;
      }
      if (linked.length >= 2) threadChips = linked;
      threadDirty = true;
      threadT.go(linked.length >= 2 ? 1 : 0, elapsed, seconds);
      if (reduced) {
        paint();
        app.render();
      }
    },
    setInspectable(flags: readonly boolean[]): void {
      chips.forEach((chip, i) => {
        const on = flags[i] === true;
        pickable[i] = on;
        chip.root.eventMode = on ? "static" : "none";
        chip.root.cursor = on ? "pointer" : "default";
        if (!on) hovered[i] = false;
      });
      if (reduced) {
        paint();
        app.render();
      }
    },
    jolt(): void {
      if (reduced) return;
      kickAt = elapsed;
    },
    destroy(): void {
      ro.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      app.destroy(true, { children: true, texture: true, textureSource: true });
      canvas.remove();
    },
  };
}
