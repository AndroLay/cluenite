import { Application, Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { buildInvestigationScene, type InvestigationScene } from "./investigationScene";

export type CaseTheme = "gallery" | "festival" | "signal" | "express" | "lighthouse";
export type ScenePoint = { x: number; y: number };
export type SceneObject = ScenePoint & { id: string; found: boolean };
export type SceneCue = { kind: "clue" | "share" | "proof"; point?: ScenePoint };
export interface CaseStage {
  state(value: { paused?: boolean; reduced?: boolean; dark?: boolean; wreck?: boolean; overlay?: boolean }): void;
  focus(point: ScenePoint | null): void;
  cue(value: SceneCue): void;
  objects(value: SceneObject[]): void;
  destroy(): void;
}
interface Options {
  theme: CaseTheme;
  background?: string;
  artwork?: SVGSVGElement;
  team?: string | null;
  paused: boolean;
  reduced: boolean;
  dark?: boolean;
  wreck?: boolean;
  onLightning?: (strength: number) => void;
  objects?: SceneObject[];
  onPick?: (id: string) => void;
}
interface Mover { node: Container; update(time: number, dt: number): void }

// One private ticker and scene graph per visible scene. Text and game controls stay in the DOM.
export async function createCaseStage(host: HTMLElement, options: Options): Promise<CaseStage> {
  const board = options.theme === "express" || options.theme === "lighthouse";
  const width = board ? 1200 : 1600;
  const height = board ? 360 : 900;
  const compact = window.matchMedia("(max-width: 760px)").matches;
  const app = new Application();
  const ownedTextures = new Set<Texture>();
  let nativeScene: InvestigationScene | null = null;
  try {
  await app.init({ antialias: true, autoDensity: true, backgroundAlpha: 0, autoStart: false,
    resolution: Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2), preference: "webgl", powerPreference: "low-power" });
  const canvas = app.canvas;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.pixiScene = options.theme;
  canvas.dataset.running = "false";
  canvas.dataset.frame = "0";
  const world = new Container();
  world.eventMode = "passive";
  app.stage.addChild(world);
  const scenery = new Container();
  const atmosphere = new Container();
  const feedback = new Container();
  atmosphere.eventMode = feedback.eventMode = "none";
  world.addChild(scenery, atmosphere, feedback);
  const movers: Mover[] = [];
  let disposed = false;
  let paused = options.paused;
  let reduced = options.reduced;
  let dark = !!options.dark;
  let wreck = !!options.wreck;
  let overlay = false;
  let inView = true;
  let time = 0;
  let frames = 0;
  let targetX = 0;
  let targetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let seed = 0x3a59e1;
  const random = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function move(node: Container, update: Mover["update"]): void { movers.push({ node, update }); }
  function own(texture: Texture): Texture { ownedTextures.add(texture); return texture; }
  function glowTexture(): Texture {
    const source = document.createElement("canvas"); source.width = source.height = 96;
    const ctx = source.getContext("2d")!;
    const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    gradient.addColorStop(0, "#fff1c7"); gradient.addColorStop(.18, "#ffe7b5b3"); gradient.addColorStop(.5, "#ffe7b52e"); gradient.addColorStop(1, "#ffe7b500");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 96, 96);
    return own(Texture.from(source));
  }
  const glow = glowTexture();
  let sceneObjects = options.objects ?? [];
  nativeScene = !board && !options.background ? buildInvestigationScene(options.theme as "gallery" | "festival" | "signal", options.team, glow, own, id => { canvas.dataset.pickedObject = id; options.onPick?.(id); }) : null;
  if (nativeScene) { scenery.addChild(nativeScene.root); canvas.dataset.sceneArt = "procedural"; }
  function placeObjects(): void {
    nativeScene?.objects(sceneObjects, item => worldPoint(item), app.screen.height < 320 ? .52 : app.screen.width < 760 ? .58 : .85);
    canvas.dataset.sceneObjects = String(sceneObjects.length);
  }
  function halo(x: number, y: number, size: number, alpha: number): Sprite {
    const node = new Sprite(glow); node.anchor.set(.5); node.position.set(x, y); node.width = node.height = size; node.alpha = alpha; node.blendMode = "add"; atmosphere.addChild(node); return node;
  }
  async function svgTexture(selectors: string[] | null, omit: string[] = [], tile = false): Promise<Texture> {
    const source = options.artwork!;
    const svg = source.cloneNode(!selectors) as SVGSVGElement;
    svg.removeAttribute("class"); svg.removeAttribute("style");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("viewBox", `0 0 ${tile ? 2400 : 1200} 360`);
    const gl = "gl" in app.renderer ? app.renderer.gl as WebGLRenderingContext : null;
    const limit = gl ? Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 4096;
    const density = Math.min(window.devicePixelRatio || 1, 2, limit / (tile ? 2400 : 1200));
    svg.setAttribute("width", `${(tile ? 2400 : 1200) * density}`); svg.setAttribute("height", `${360 * density}`);
    if (selectors) {
      const defs = source.querySelector("defs"); if (defs) svg.appendChild(defs.cloneNode(true));
      for (const selector of selectors) for (const element of source.querySelectorAll(selector)) {
        const clone = element.cloneNode(true) as SVGElement;
        // Extracted layers retain inherited paint from their original SVG groups.
        for (const attribute of ["fill", "stroke", "stroke-width"]) {
          if (clone.hasAttribute(attribute)) continue;
          let ancestor = element.parentElement;
          while (ancestor && !ancestor.isSameNode(source)) {
            const value = ancestor.getAttribute(attribute);
            if (value) { clone.setAttribute(attribute, value); break; }
            ancestor = ancestor.parentElement;
          }
        }
        svg.appendChild(clone);
      }
    }
    for (const selector of omit) for (const element of svg.querySelectorAll(selector)) element.remove();
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Scene illustration could not load")); image.src = url; });
      return own(Texture.from(image));
    } finally { URL.revokeObjectURL(url); }
  }
  async function illustratedBoard(): Promise<void> {
    const express = options.theme === "express";
    const selectors = express ? [".bs-far", ".bs-near", ".bs-poles", ".bs-train"] : [".bs-cloud", ".bs-wave1", ".bs-ship-pos", ".bs-wave2", ".bs-wave3"];
    const omitted = [...selectors, ".bs-beam-wrap", ".bs-rain", ".bs-flash", ".bs-sparks", ".bs-tunnel", ".bs-steam", ".bs-sleepers", ".bs-foreground", ".bs-rocks", ".bs-foam", ".bs-lamp-glow", ".bs-lamp"];
    // Keep the authored vector artwork. Rasterize independent layers once, then animate only GPU transforms.
    const loaded = await Promise.allSettled([svgTexture(null, omitted), ...selectors.map(selector => svgTexture([selector], [".bs-steam", ".bs-spokes", ".bs-headlamp"], selector.includes("wave") || selector.includes("far") || selector.includes("near") || selector.includes("poles"))), ...(!express ? [svgTexture([".bs-foreground", ".bs-rocks", ".bs-foam"], [".bs-lamp-glow", ".bs-lamp"])] : [])]);
    const failed = loaded.find(result => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    const textures = loaded.map(result => (result as PromiseFulfilledResult<Texture>).value);
    const base = new Sprite(textures[0]); base.width = width; base.height = height; scenery.addChild(base);
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i]!;
      const node = new Sprite(textures[i + 1]);
      const tiled = /wave|far|near|poles/.test(selector);
      node.width = tiled ? width * 2 : width; node.height = height;
      scenery.addChild(node);
      if (/far|near|poles/.test(selector)) {
        const speed = selector.includes("far") ? 15 : selector.includes("near") ? 44 : 185;
        move(node, t => { node.x = -((t * speed) % (selector.includes("poles") ? 300 : 1200)); });
      } else if (selector.includes("wave")) {
        const speed = [0, 0, 0, 0, 82][i] || (i === 1 ? 36 : 60);
        const mask = new Graphics().rect(332, 258, width - 332, 102).fill(0xffffff); scenery.addChild(mask); node.mask = mask;
        move(node, t => { node.x = -(t * speed % 1200); node.y = Math.sin(t * .7 + i) * 1.8; });
      } else if (selector.includes("cloud")) {
        move(node, t => { node.x = Math.sin(t * .08) * 45; });
      } else if (selector.includes("ship")) {
        node.pivot.set(985 * node.texture.width / width, 296 * node.texture.height / height); node.position.set(985, 296);
        move(node, t => { node.rotation = (wreck ? -.14 : 0) + Math.sin(t * 1.5) * .014; node.x = 985 - (wreck ? 170 : 0); node.y = 296 + Math.sin(t * 1.2) * 1.4; });
      } else if (selector.includes("train")) {
        const tunnel = new Graphics().rect(0, 0, width, height).fill(0x030202);
        scenery.addChildAt(tunnel, scenery.getChildIndex(node)); move(tunnel, () => { tunnel.alpha = dark ? .98 : 0; });
        const rail = new Graphics().rect(0, 316, width, 44).fill(0x0b0706).moveTo(0, 317).lineTo(width, 317).stroke({ color: 0x796044, width: 2 });
        scenery.addChildAt(rail, scenery.getChildIndex(node));
        const sleepers = new Container();
        for (let x = 0; x <= 1248; x += 24) sleepers.addChild(new Graphics().rect(x, 321, 10, 7).fill(0x3c2a1b));
        scenery.addChildAt(sleepers, scenery.getChildIndex(node));
        move(sleepers, t => { sleepers.x = -(t * 145 % 24); });
        move(node, t => { node.y = Math.sin(t * 23) * .65; node.alpha = dark ? .74 : 1; });
        const lamps = new Graphics();
        for (const start of [280, 480]) for (let window = 0; window < 5; window++) lamps.roundRect(start + 14 + window * 34, 246, 24, 24, 3).fill(0x17100b);
        lamps.roundRect(764, 234, 22, 20, 2).fill(0x17100b); scenery.addChild(lamps);
        const headlamp = new Graphics().poly([922, 262, 1200, 214, 1200, 318]).fill({ color: 0xf5d59e, alpha: .12 }); scenery.addChild(headlamp);
        move(lamps, t => { lamps.alpha = dark ? 1 : 0; lamps.y = Math.sin(t * 23) * .65; headlamp.alpha = dark ? 0 : .9 + Math.sin(t * 4) * .1; });
        for (const x of [318, 432, 516, 632, 712, 790, 846]) {
          const spark = halo(x, 317, 8, 0); move(spark, t => { spark.alpha = dark ? .2 + Math.max(0, Math.sin(t * 17 + x)) * .45 : 0; });
        }
        for (let puff = 0; puff < 9; puff++) {
          const steam = halo(886, 205, 34, .2);
          move(steam, t => { const age = (t * .35 + puff / 9) % 1; steam.position.set(886 - age * 190, 205 - age * 90); steam.width = steam.height = 20 + age * 75; steam.alpha = Math.sin(age * Math.PI) * .18; });
        }
        for (const x of [304, 330, 420, 446, 504, 530, 620, 646, 694, 732, 776, 828, 880]) {
          const spoke = new Graphics().moveTo(-8, 0).lineTo(8, 0).moveTo(0, -8).lineTo(0, 8).stroke({ color: 0x9d7a46, width: 1.5, alpha: .8 });
          spoke.position.set(x, 304); scenery.addChild(spoke); move(spoke, t => { spoke.rotation = -t * 10; spoke.y = 304 + Math.sin(t * 23) * .65; });
        }
      }
    }
    if (!express) {
      const foreground = new Sprite(textures[textures.length - 1]); foreground.width = width; foreground.height = height; scenery.addChild(foreground);
      const beam = new Graphics().poly([0, -5, 1020, -90, 1020, 90, 0, 5]).fill({ color: 0xf4d18c, alpha: .12 });
      beam.position.set(180, 98); atmosphere.addChild(beam);
      const lamp = halo(180, 98, 90, .4);
      const lantern = new Graphics().rect(164, 84, 32, 20).fill(0xf5d59e).moveTo(172, 84).lineTo(172, 104).moveTo(188, 84).lineTo(188, 104).stroke({ color: 0x2a1f1a, width: 1.5 }); atmosphere.addChild(lantern);
      move(beam, t => { beam.scale.x = Math.cos(t * .48); beam.alpha = dark ? 0 : 1; lamp.alpha = dark ? 0 : .42; lantern.alpha = dark ? 0 : 1; });
    }
  }
    if (options.artwork) await illustratedBoard();
    else if (options.background) {
      const texture = await Assets.load<Texture>(options.background);
      const image = new Sprite(texture); const scale = Math.max(width / texture.width, height / texture.height); image.scale.set(scale); image.position.set((width - image.width) / 2, (height - image.height) / 2); scenery.addChild(image);
      const grade = new Graphics().rect(0, 0, width, height).fill({ color: 0x1a1008, alpha: .07 }); scenery.addChild(grade);
    }

  const outside = options.theme === "lighthouse" || (options.theme === "signal" && options.team !== "B");
  if (board) {
    const paper = document.createElement("canvas"); paper.width = 600; paper.height = 180;
    const ctx = paper.getContext("2d")!;
    for (let i = 0; i < 16000; i++) { ctx.fillStyle = random() > .5 ? "#edcda216" : "#05060928"; ctx.fillRect(random() * 600, random() * 180, 1, 1); }
    const edge = ctx.createRadialGradient(300, 80, 60, 300, 90, 340); edge.addColorStop(0, "#09090b00"); edge.addColorStop(.6, "#09090b00"); edge.addColorStop(1, "#09090b88"); ctx.fillStyle = edge; ctx.fillRect(0, 0, 600, 180);
    const finish = new Sprite(own(Texture.from(paper))); finish.width = width; finish.height = height; finish.alpha = .14; atmosphere.addChild(finish);
    if (options.theme === "express") {
      for (const [x, y] of [[80, 40], [260, 30], [470, 22], [730, 18], [900, 26], [1080, 36]]) {
        const star = halo(x!, y!, 9, .3); move(star, t => { star.alpha = dark ? 0 : .13 + Math.sin(t * .7 + x!) ** 2 * .28; });
      }
      for (const x of [306, 374, 442, 506, 574, 642]) {
        const glow = halo(x, 260, 49, .11); glow.scale.y = .5;
        move(glow, t => { glow.alpha = dark ? 0 : .09 + Math.sin(t * 1.1 + x) * .025; });
      }
    } else {
      for (let i = 0; i < 14; i++) {
        const glimmer = new Graphics().moveTo(-9, 0).quadraticCurveTo(0, -2, 15, 0).stroke({ color: 0xa4b4ae, width: 1, alpha: .3 });
        glimmer.position.set(390 + i * 59, 287 + (i % 4) * 15); atmosphere.addChild(glimmer);
        move(glimmer, t => { glimmer.x = 390 + i * 59 + Math.sin(t * .7 + i) * 12; glimmer.alpha = .15 + Math.sin(t * .9 + i) ** 2 * .5; });
      }
    }
  }
  if (!board) {
    for (let i = 0; i < 3; i++) {
      const light = new Graphics().poly([0, 0, 22, 0, 370, height, -260, height]).fill({ color: 0xffe3a3, alpha: i === 0 ? .055 : .025 });
      light.position.set(width * (.23 + i * .3), -height * .08); atmosphere.addChild(light);
      move(light, t => { light.rotation = Math.sin(t * .13 + i * 2) * .035; light.alpha = .8 + Math.sin(t * .7 + i) * .16; });
    }
    const pool = halo(width * .55, height * .67, width * .6, .07); pool.scale.y *= .18;
    if (options.theme === "gallery") {
      const shadow = new Graphics().ellipse(0, 0, 90, 16).fill({ color: 0x080605, alpha: .42 });
      atmosphere.addChild(shadow);
      move(shadow, t => { const cycle = (t % 22) / 22; shadow.position.set(width * (.12 + cycle * .7), height * (.76 + Math.sin(cycle * 4) * .02)); shadow.alpha = Math.sin(cycle * Math.PI) * .7; shadow.scale.x = 1 + Math.sin(t * .5) * .14; });
    }
    if (options.theme === "festival") {
      const reflection = new Graphics().poly([0, 0, 36, 0, 280, 650, 245, 650]).fill({ color: 0xffe9b9, alpha: .065 });
      atmosphere.addChild(reflection);
      move(reflection, t => { const cycle = (t % 19) / 19; reflection.position.set(width * (.1 + cycle * .65), height * .18); reflection.alpha = Math.sin(cycle * Math.PI); });
      for (const [x, y] of [[.32, .45], [.58, .62], [.78, .38]]) {
        const glint = halo(width * x!, height * y!, 50, .1);
        move(glint, t => { glint.alpha = Math.max(0, Math.sin(t * .65 + x! * 12)) ** 8 * .22; });
      }
    }
  }
  // Batched sprites share one generated texture; no per-frame geometry rebuild or full-screen filter.
  const dust = new Container(); atmosphere.addChild(dust);
  for (let i = 0; i < (compact ? 30 : 58); i++) {
    const sprite = new Sprite(glow); sprite.anchor.set(.5); sprite.blendMode = "add";
    const x = random() * width, y = random() * height, phase = random() * Math.PI * 2, speed = 3 + random() * 8;
    sprite.width = sprite.height = board ? 2 + random() * 3 : 4 + random() * 7;
    dust.addChild(sprite);
    move(sprite, t => { sprite.position.set((x + t * speed) % width, (y - t * speed * .3 + height * 100) % height); sprite.alpha = (.12 + Math.sin(t * .7 + phase) * .1) * (outside ? .3 : 1); });
  }
  if (outside) {
    const rainSource = document.createElement("canvas"); rainSource.width = 8; rainSource.height = 48;
    const ctx = rainSource.getContext("2d")!; const gradient = ctx.createLinearGradient(8, 0, 0, 48);
    gradient.addColorStop(0, "#f5dfbb00"); gradient.addColorStop(1, "#f5dfbb99"); ctx.strokeStyle = gradient; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(0, 48); ctx.stroke();
    const rainTexture = own(Texture.from(rainSource));
    const rain = new Container(); atmosphere.addChild(rain);
    for (let i = 0; i < (compact ? 55 : 105); i++) {
      const drop = new Sprite(rainTexture); const depth = .25 + random() * .75;
      drop.scale.set((board ? .55 : 1) * depth); drop.alpha = .12 + depth * .22; rain.addChild(drop);
      const x = random() * width, y = random() * height, speed = (board ? 170 : 440) * depth;
      move(drop, t => { drop.y = (y + t * speed) % (height + 60) - 60; drop.x = (x - t * speed * .17 + width * 100) % width; });
    }
    if (!board) {
      const sea = new Container(); atmosphere.addChild(sea);
      for (let i = 0; i < 23; i++) {
        const line = new Graphics().roundRect(0, 0, 20 + random() * 85, 1.1, .55).fill({ color: 0xd1ae70, alpha: .1 + random() * .15 });
        const x = random() * width, y = height * (.42 + random() * .15); sea.addChild(line);
        move(line, t => { line.position.set(x + Math.sin(t * .3 + i) * 16, y + Math.sin(t * .55 + i) * 2); line.alpha = .45 + Math.sin(t * .7 + i) * .35; });
      }
    }
  }
  const focus = new Graphics().roundRect(-32, -32, 64, 64, 8).stroke({ color: 0xefc881, width: 1.4, alpha: .85 });
  const focusHalo = new Sprite(glow); focusHalo.anchor.set(.5); focusHalo.width = focusHalo.height = board ? 90 : 180; focusHalo.alpha = .11; focusHalo.blendMode = "add";
  const focusGroup = new Container(); focusGroup.addChild(focusHalo, focus); focusGroup.visible = false; feedback.addChild(focusGroup);
  const pulse = new Graphics().circle(0, 0, 28).stroke({ color: 0xe9bd72, width: 1.4, alpha: .9 }); pulse.visible = false; feedback.addChild(pulse);
  const burst = new Container(); feedback.addChild(burst);
  const particles = Array.from({ length: compact ? 20 : 34 }, () => { const node = new Sprite(glow); node.anchor.set(.5); node.blendMode = "add"; node.visible = false; burst.addChild(node); return { node, x: 0, y: 0, vx: 0, vy: 0, age: 2, life: 1 }; });
  const handoff = new Container(); handoff.visible = false; feedback.addChild(handoff);
  handoff.addChild(new Graphics().moveTo(-190, 0).bezierCurveTo(-70, -95, 70, 95, 190, 0).stroke({ color: 0xd3a762, alpha: .7, width: 1.5 }));
  const traveler = new Sprite(glow); traveler.anchor.set(.5); traveler.width = traveler.height = 28; traveler.blendMode = "add"; handoff.addChild(traveler);
  const endA = new Graphics().circle(-190, 0, 8).circle(190, 0, 8).stroke({ color: 0xf0ce8c, alpha: .9, width: 1.5 }); handoff.addChild(endA);
  let cueAge = 10;
  let cueKind: SceneCue["kind"] = "clue";
  let cuePoint: ScenePoint = { x: .5, y: .55 };
  let focusedPoint: ScenePoint | null = null;
  function worldPoint(point: ScenePoint): ScenePoint { return { x: (point.x * app.screen.width - world.x) / world.scale.x, y: (point.y * app.screen.height - world.y) / world.scale.y }; }
  function paintFeedback(dt: number): void {
    cueAge += dt;
    const life = Math.min(cueAge / 1.5, 1);
    pulse.visible = !reduced && life < 1;
    const point = worldPoint(cuePoint);
    pulse.position.set(point.x, point.y);
    pulse.scale.set(1 + life * (cueKind === "proof" ? 6 : 2.6)); pulse.alpha = (1 - life) * .8;
    handoff.visible = !reduced && cueKind === "share" && cueAge < 2.2;
    handoff.position.set(width * .5, height * .6); handoff.alpha = Math.min(1, cueAge * 5, Math.max(0, (2.2 - cueAge) * 3));
    const p = Math.min(1, cueAge / 1.5); traveler.position.set(-190 + p * 380, Math.sin(p * Math.PI * 2) * -32);
    for (const particle of particles) {
      particle.age += dt;
      particle.node.visible = !reduced && particle.age < particle.life;
      if (!particle.node.visible) continue;
      const age = particle.age; particle.node.position.set(particle.x + particle.vx * age, particle.y + particle.vy * age + 25 * age * age);
      particle.node.alpha = (1 - age / particle.life) * .8; particle.node.scale.set((.045 + (1 - age / particle.life) * .05) * (board ? .7 : 1));
    }
  }
  function draw(dt: number): void {
    pointerX += (targetX - pointerX) * Math.min(1, dt * 5); pointerY += (targetY - pointerY) * Math.min(1, dt * 5);
    atmosphere.position.set(reduced ? 0 : pointerX * (board ? 1.5 : 5), reduced ? 0 : pointerY * 3);
    if (!overlay) { for (const mover of movers) mover.update(time, dt); nativeScene?.update(time); }
    focusGroup.alpha = reduced ? 1 : .85 + Math.sin(time * 3) * .15;
    if (focusedPoint) { const point = worldPoint(focusedPoint); focusGroup.position.set(point.x, point.y); }
    paintFeedback(dt);
  }
  function fit(): void {
    if (disposed) return;
    const rect = host.getBoundingClientRect();
    const phone = window.matchMedia("(max-width: 760px)").matches;
    app.ticker.maxFPS = phone ? 45 : 60;
    app.renderer.resize(Math.max(1, rect.width), Math.max(1, rect.height), Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
    const scale = Math.max(rect.width / width, rect.height / height);
    world.scale.set(scale); world.position.set((rect.width - width * scale) / 2, (rect.height - height * scale) / 2);
    placeObjects(); draw(0);
    app.render();
  }
  function sync(): void {
    if (disposed) return;
    const playing = !paused && !reduced && inView && !document.hidden && (!overlay || cueAge < 2.2);
    nativeScene?.interactive(!paused && !overlay);
    canvas.dataset.running = String(playing);
    if (playing) app.start(); else { app.stop(); draw(0); app.render(); }
  }
  function pointer(event: PointerEvent): void { const rect = host.getBoundingClientRect(); targetX = (event.clientX - rect.left) / rect.width - .5; targetY = (event.clientY - rect.top) / rect.height - .5; if (reduced) { draw(0); app.render(); } }
  function leave(): void { targetX = targetY = 0; }
  let lastLightning = 0;
  app.ticker.maxFPS = compact ? 45 : 60;
  app.ticker.add(ticker => {
    const dt = Math.min(.05, ticker.deltaMS / 1000); time += dt; draw(dt);
    if (++frames % 12 === 0) canvas.dataset.frame = String(frames);
    if (overlay && cueAge >= 2.2) sync();
    // A low-contrast distant weather glow, never a rapid full-screen flash.
    if (options.theme === "lighthouse" && Math.floor(time / 15) > lastLightning) { lastLightning = Math.floor(time / 15); options.onLightning?.(.4); }
  });
  const resize = new ResizeObserver(fit); resize.observe(host);
  const intersection = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting); sync(); }); intersection.observe(host);
  document.addEventListener("visibilitychange", sync);
  host.addEventListener("pointermove", pointer, { passive: true }); host.addEventListener("pointerleave", leave);
  host.appendChild(canvas); draw(0); fit(); sync();
  return {
    objects(value): void { sceneObjects = value; placeObjects(); draw(0); if (paused || reduced) app.render(); },
    state(value): void { if (value.paused !== undefined) paused = value.paused; if (value.reduced !== undefined) reduced = value.reduced; if (value.dark !== undefined) dark = value.dark; if (value.wreck !== undefined) wreck = value.wreck; if (value.overlay !== undefined) { overlay = value.overlay; scenery.visible = atmosphere.visible = !overlay; } sync(); },
    focus(point): void { focusedPoint = point; focusGroup.visible = !!point; if (point) { const at = worldPoint(point); focusGroup.position.set(at.x, at.y); } if (paused || reduced) app.render(); },
    cue(value): void {
      cueAge = 0; cueKind = value.kind; cuePoint = value.point ?? { x: .5, y: .55 };
      const at = worldPoint(cuePoint);
      for (const particle of particles) { const angle = random() * Math.PI * 2; const speed = 30 + random() * (board ? 55 : 105); particle.x = at.x; particle.y = at.y; particle.vx = Math.cos(angle) * speed; particle.vy = Math.sin(angle) * speed - 20; particle.age = 0; particle.life = .65 + random() * .7; }
      draw(0); sync();
    },
    destroy(): void {
      if (disposed) return;
      disposed = true; app.stop(); resize.disconnect(); intersection.disconnect();
      document.removeEventListener("visibilitychange", sync); host.removeEventListener("pointermove", pointer); host.removeEventListener("pointerleave", leave);
      app.destroy(true, { children: true, texture: false, textureSource: false }); nativeScene?.destroy(); ownedTextures.forEach(texture => texture.destroy(true)); canvas.remove();
    },
  };
  } catch (error) {
    try { app.destroy(true, { children: true, texture: false, textureSource: false }); } catch { /* Initialization can fail before the renderer exists. */ }
    nativeScene?.destroy(); ownedTextures.forEach(texture => texture.destroy(true));
    throw error;
  }
}
