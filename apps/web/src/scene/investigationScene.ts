import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";

export interface InvestigationObject { id: string; x: number; y: number; found: boolean }
export interface InvestigationScene {
  root: Container;
  objects(items: InvestigationObject[], point: (item: InvestigationObject) => { x: number; y: number }, scale: number): void;
  interactive(enabled: boolean): void;
  update(time: number): void;
  destroy(): void;
}
type Theme = "gallery" | "festival" | "signal";
type Item = { root: Container; art: Container; light: Sprite; rim: Graphics; x: number; y: number; scale: number; found: boolean; phase: number };
const P = { ink: 0x100e10, wall: 0x241e20, walnut: 0x38261e, wood: 0x65442c, gold: 0xb68a4f, edge: 0xe3bd7c, paper: 0xe5cf9c, glass: 0x97b9b7, sea: 0x142c37, green: 0x86b8a1 };

// Built from GPU geometry and generated gradients. Public clue IDs only identify selectable objects.
export function buildInvestigationScene(theme: Theme, team: string | null | undefined, glow: Texture, own: (texture: Texture) => Texture, pick?: (id: string) => void): InvestigationScene {
  const root = new Container();
  const architecture = new Container();
  const weather = new Container();
  const objects = new Container();
  root.addChild(architecture, weather, objects);
  architecture.eventMode = weather.eventMode = "none";
  objects.eventMode = "passive";
  const motion: ((time: number) => void)[] = [];
  const items = new Map<string, Item>();
  let enabled = true;
  let hover: string | null = null;
  function shape(parent: Container): Graphics { const g = new Graphics(); parent.addChild(g); return g; }
  function gradient(top: string, bottom: string): Sprite {
    const source = document.createElement("canvas"); source.width = 8; source.height = 256;
    const ctx = source.getContext("2d")!; const fill = ctx.createLinearGradient(0, 0, 0, 256);
    fill.addColorStop(0, top); fill.addColorStop(1, bottom); ctx.fillStyle = fill; ctx.fillRect(0, 0, 8, 256);
    const sprite = new Sprite(own(Texture.from(source))); sprite.width = 1600; sprite.height = 900; architecture.addChild(sprite); return sprite;
  }
  function lamp(parent: Container, x: number, y: number, size: number, alpha: number, tint = P.edge): Sprite {
    const sprite = new Sprite(glow); sprite.anchor.set(.5); sprite.position.set(x, y); sprite.width = sprite.height = size; sprite.alpha = alpha; sprite.tint = tint; sprite.blendMode = "add"; parent.addChild(sprite); return sprite;
  }
  function floor(): void {
    const g = shape(architecture);
    g.poly([0, 440, 1600, 440, 1600, 900, 0, 900]).fill(0x211c1b);
    for (let x = -2200; x <= 3800; x += 260) g.moveTo(800, 440).lineTo(x, 900).stroke({ color: 0x9a7652, width: 1, alpha: .15 });
    for (const y of [475, 510, 560, 630, 730, 865]) g.moveTo(0, y).lineTo(1600, y).stroke({ color: P.edge, width: 1, alpha: .16 });
    for (const x of [280, 800, 1320]) { const reflection = lamp(architecture, x, 655, 450, .1); reflection.scale.y *= .28; }
  }
  function framedPanel(x: number, y: number, w: number, h: number): void {
    const g = shape(architecture);
    g.roundRect(x - 14, y - 14, w + 28, h + 28, 6).fill(0x100e0c).stroke({ color: P.wood, width: 9 });
    g.rect(x, y, w, h).fill(0x182128).stroke({ color: P.gold, width: 3 });
    g.poly([x + 8, y + h - 20, x + w * .3, y + h * .48, x + w * .55, y + h * .7, x + w * .8, y + h * .35, x + w - 8, y + h - 20]).fill(0x35413a);
    g.circle(x + w * .7, y + h * .24, w * .09).fill({ color: P.paper, alpha: .45 });
    g.rect(x + 7, y + 7, w - 14, h - 14).stroke({ color: P.edge, width: 1, alpha: .35 });
    lamp(architecture, x + w / 2, y - 5, w * 1.8, .11);
  }
  function interior(festival: boolean): void {
    gradient(festival ? "#382327" : "#211d27", "#100d0c");
    const g = shape(architecture);
    g.poly([0, 0, 420, 100, 420, 440, 0, 690]).fill(0x241b1b);
    g.poly([1600, 0, 1180, 100, 1180, 440, 1600, 690]).fill(0x191719);
    g.rect(420, 100, 760, 350).fill(festival ? 0x38252a : 0x272127);
    g.poly([0, 0, 1600, 0, 1180, 100, 420, 100]).fill(0x161319);
    for (const offset of [0, 18, 40]) g.moveTo(offset, offset).lineTo(420, 100 + offset / 2).lineTo(1180, 100 + offset / 2).lineTo(1600 - offset, offset).stroke({ color: P.gold, width: 2, alpha: .32 });
    for (const x of [375, 1160]) {
      g.rect(x, 110, 55, 360).fill(0x49372c).stroke({ color: P.gold, width: 2, alpha: .45 });
      for (let i = 0; i < 4; i++) g.rect(x + 10 + i * 10, 130, 3, 310).fill({ color: P.edge, alpha: .15 });
      g.rect(x - 10, 90, 75, 24).fill(0x6e5238).rect(x - 14, 452, 83, 20).fill(0x493426);
    }
    for (const x of [470, 930]) framedPanel(x, 170, 200, 210);
    g.roundRect(727, 155, 146, 300, 70).fill(0x111319).stroke({ color: P.gold, width: 4 });
    g.rect(730, 240, 140, 213).fill(0x1a1a1e).moveTo(800, 220).lineTo(800, 450).stroke({ color: P.gold, width: 2, alpha: .35 });
    g.circle(784, 338, 4).circle(816, 338, 4).fill(P.edge);
    floor();
    for (const x of [245, 800, 1355]) {
      const fixture = new Container(); fixture.position.set(x, 115); weather.addChild(fixture);
      shape(fixture).moveTo(0, -115).lineTo(0, 0).stroke({ color: P.gold, width: 2 }).ellipse(0, 0, 38, 9).fill(P.gold).poly([-24, 0, 24, 0, 16, 30, -16, 30]).fill(0xb08e5d).stroke({ color: P.edge, width: 2 });
      lamp(fixture, 0, 28, 260, .17);
      motion.push(t => { fixture.rotation = Math.sin(t * .36 + x) * .015; });
    }
    if (festival) {
      const bunting = shape(weather);
      bunting.moveTo(50, 90).quadraticCurveTo(800, 340, 1550, 90).stroke({ color: P.gold, width: 2 });
      for (let i = 0; i < 19; i++) {
        const x = 50 + i * 83, y = 90 + Math.sin(i / 18 * Math.PI) * 115;
        bunting.poly([x - 18, y, x + 18, y, x, y + 43]).fill(i % 2 ? 0x8c4938 : 0xb48d51);
        const bulb = lamp(weather, x, y, 32, .27); motion.push(t => { bulb.alpha = .23 + Math.sin(t * .6 + i) * .035; });
      }
      const rope = shape(architecture);
      for (const x of [135, 510, 1090, 1465]) rope.ellipse(x, 775, 24, 6).fill(0x100c0a).rect(x - 4, 660, 8, 114).fill(P.gold).circle(x, 655, 10).fill(P.edge);
      rope.moveTo(135, 667).quadraticCurveTo(320, 752, 510, 667).moveTo(1090, 667).quadraticCurveTo(1280, 752, 1465, 667).stroke({ color: 0x713535, width: 12 });
    }
  }
  function coast(): void {
    gradient("#0f1727", "#183038");
    const g = shape(architecture);
    g.circle(1200, 205, 46).fill({ color: 0xd8d8ba, alpha: .6 }); lamp(architecture, 1200, 205, 360, .1, 0xb2d0ce);
    g.rect(0, 395, 1600, 400).fill(0x142b35);
    for (let row = 0; row < 15; row++) {
      const wave = new Graphics(); weather.addChild(wave);
      const y = 410 + row * row * 1.5;
      for (let i = 0; i < 12; i++) wave.moveTo(i * 165, y).quadraticCurveTo(i * 165 + 40, y - 2 - row, i * 165 + 100, y).stroke({ color: row % 2 ? 0x36575c : 0x668282, alpha: .17 + row * .014, width: 1 + row * .12 });
      motion.push(t => { wave.x = Math.sin(t * (.2 + row * .03) + row) * (8 + row); wave.y = Math.sin(t * .45 + row) * 2; });
    }
    for (let i = 0; i < 5; i++) {
      const cloud = shape(weather).ellipse(150 + i * 370, 170 + i % 2 * 100, 290, 38).fill({ color: 0x263340, alpha: .76 });
      motion.push(t => { cloud.x = Math.sin(t * .025 + i) * 70; });
    }
    const frame = shape(architecture);
    for (const x of [70, 480, 1090, 1510]) frame.rect(x, 0, 18, 610).fill(0x30251e).rect(x + 15, 0, 3, 610).fill({ color: P.gold, alpha: .6 });
    frame.rect(0, 365, 1600, 12).fill(0x3b2e24).rect(0, 600, 1600, 35).fill(0x4b3627);
    frame.poly([0, 635, 1600, 635, 1600, 900, 0, 900]).fill(0x30261f);
    for (let i = 0; i < 12; i++) frame.moveTo(0, 650 + i * 23).lineTo(1600, 650 + i * 23).stroke({ color: P.edge, alpha: .08, width: 1 });
    frame.rect(0, 630, 1600, 9).fill(0x896443);
    if (team === "B") {
      frame.rect(0, 80, 420, 520).fill(0x211e1d);
      for (let i = 0; i < 4; i++) {
        frame.rect(10, 140 + i * 100, 390, 9).fill(P.wood);
        for (let j = 0; j < 12; j++) frame.rect(20 + j * 30, 90 + i * 100, 18, 48).fill(j % 3 ? 0x76684e : 0x854e38);
      }
      lamp(architecture, 270, 530, 650, .18);
    }
  }
  if (theme === "signal") coast(); else interior(theme === "festival");

  // Set dressing is illustrative and cannot release evidence or change the case clock.
  function roomDetails(): void {
    const g = shape(architecture);
    if (theme !== "signal") {
      for (const x of [20, 1250]) {
        g.roundRect(x, 270, 330, 290, 6).fill({ color: 0x171110, alpha: .6 }).stroke({ color: P.gold, width: 2, alpha: .35 });
        for (let i = 0; i < 5; i++) g.rect(x + 14 + i * 64, 292, 48, 246).stroke({ color: 0x9d7348, width: 1, alpha: .3 });
        g.rect(x - 5, 553, 340, 11).fill(0x5a3c28).rect(x - 5, 564, 340, 5).fill(0x16100e);
      }
      // A runner, carved bench and draped side table ground the room at several depths.
      g.poly([540, 470, 1060, 470, 1430, 900, 170, 900]).fill({ color: theme === "festival" ? 0x632c2c : 0x302e35, alpha: .53 });
      g.poly([556, 483, 1044, 483, 1385, 888, 215, 888]).stroke({ color: P.gold, width: 2, alpha: .22 });
      for (let i = 0; i < 10; i++) g.moveTo(475 - i * 24, 590 + i * 29).lineTo(1125 + i * 24, 590 + i * 29).stroke({ color: P.edge, width: 1, alpha: .035 });
      g.poly([35, 650, 280, 637, 294, 670, 41, 690]).fill(0x69452c).stroke({ color: P.gold, width: 2 });
      g.poly([41, 690, 294, 670, 291, 698, 43, 720]).fill(0x281b16);
      for (const x of [55, 259]) g.poly([x, 704, x + 17, 702, x + 14, 772, x + 5, 775]).fill(0x38251b);
      for (let x = 62; x < 270; x += 31) g.moveTo(x, 651).lineTo(x + 5, 679).stroke({ color: P.edge, width: 1, alpha: .3 });
      g.ellipse(140, 779, 160, 13).fill({ color: 0x080706, alpha: .38 });
      for (const x of [110, 1445]) {
        g.poly([x - 40, 520, x + 40, 520, x + 29, 583, x - 29, 583]).fill(0x715344).stroke({ color: P.gold, width: 2, alpha: .6 });
        for (let i = 0; i < 9; i++) {
          const dx = Math.sin(i * 2.4) * 47, dy = 445 + (i % 3) * 18;
          g.moveTo(x, 527).quadraticCurveTo(x + dx * .2, dy, x + dx, dy - 20).stroke({ color: 0x67705a, width: 3 });
          g.ellipse(x + dx, dy - 20, 10, 23).fill(i % 2 ? 0x3d5141 : 0x5a6650);
        }
      }
    } else {
      // Distant harbour contours and a chart table remain scenery, with no invented signal contacts.
      g.poly([0, 397, 0, 356, 160, 365, 250, 340, 390, 374, 510, 359, 680, 395]).fill(0x152328);
      for (let i = 0; i < 14; i++) {
        const x = 12 + i * 43, y = 365 + (i % 3) * 9;
        g.rect(x, y, 29, 32).fill(i % 2 ? 0x1c292c : 0x253234);
        g.rect(x + 7, y + 7, 3, 5).fill({ color: P.paper, alpha: .3 });
      }
      g.poly([0, 812, 1600, 812, 1600, 900, 0, 900]).fill(0x201812);
      g.rect(0, 810, 1600, 6).fill(0x9a7048).rect(0, 822, 1600, 3).fill(0x0e0d0d);
      g.poly([70, 834, 325, 846, 302, 894, 48, 880]).fill(0xb6a67d).stroke({ color: P.edge, width: 1, alpha: .5 });
      for (let i = 0; i < 6; i++) g.moveTo(80 + i * 38, 840).lineTo(60 + i * 38, 881).stroke({ color: 0x65726d, width: 1, alpha: .45 });
      g.moveTo(76, 870).bezierCurveTo(135, 820, 215, 900, 299, 859).stroke({ color: 0x75634c, width: 2 });
      g.circle(1260, 852, 30).fill(0x302e26).stroke({ color: P.gold, width: 4 });
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.moveTo(1260 + Math.sin(a) * 20, 852 + Math.cos(a) * 20).lineTo(1260 + Math.sin(a) * 26, 852 + Math.cos(a) * 26).stroke({ color: P.paper, width: 1 }); }
      g.poly([1260, 829, 1253, 854, 1260, 865, 1267, 850]).fill(0xa97758);
    }
  }
  roomDetails();

  // One static generated texture gives painted material variation without full-screen filters.
  const material = document.createElement("canvas"); material.width = 800; material.height = 450;
  const context = material.getContext("2d")!;
  let grainSeed = 1579;
  const next = (): number => { grainSeed = (Math.imul(grainSeed, 1664525) + 1013904223) >>> 0; return grainSeed / 4294967296; };
  for (let i = 0; i < 26000; i++) { context.fillStyle = next() > .5 ? "#e5c49312" : "#08060620"; context.fillRect(next() * 800, next() * 450, 1, 1); }
  const shade = context.createRadialGradient(400, 190, 50, 400, 200, 470); shade.addColorStop(0, "#08070700"); shade.addColorStop(.6, "#08070708"); shade.addColorStop(1, "#080707a0"); context.fillStyle = shade; context.fillRect(0, 0, 800, 450);
  const patina = new Sprite(own(Texture.from(material))); patina.width = 1600; patina.height = 900; patina.alpha = .2; patina.eventMode = "none"; root.addChild(patina);

  function camera(parent: Container): void {
    const g = shape(parent);
    g.ellipse(0, 0, 100, 14).fill({ color: P.ink, alpha: .5 }).rect(-10, -100, 20, 99).fill(P.wood).roundRect(-70, -158, 116, 73, 10).fill(0x3c4143).stroke({ color: 0x88908a, width: 2 });
    g.poly([-70, -158, -42, -176, 72, -176, 46, -158]).fill(0x66706d).poly([46, -158, 72, -176, 72, -104, 46, -85]).fill(0x20292b);
    g.circle(-21, -122, 29).fill(0x111b20).stroke({ color: P.gold, width: 5 }).circle(-21, -122, 17).fill(0x203f4a).circle(-26, -129, 6).fill({ color: 0xbce3e1, alpha: .7 });
    g.circle(25, -147, 3).fill(0xc47b5d).rect(-61, -154, 80, 3).fill({ color: 0xffffff, alpha: .18 });
    g.moveTo(57, -97).bezierCurveTo(120, -80, 70, -42, 95, -16).stroke({ color: 0x151516, width: 5 });
  }
  function book(parent: Container, record = false): void {
    const g = shape(parent);
    g.ellipse(0, 0, 125, 13).fill({ color: P.ink, alpha: .45 }).poly([-104, -31, -92, -114, 98, -106, 111, -25]).fill(0x6a4930).stroke({ color: P.gold, width: 2 });
    g.poly([-92, -38, -80, -130, 0, -143, 84, -124, 97, -34, 0, -52]).fill(P.paper).stroke({ color: 0x957c51, width: 2 });
    g.moveTo(0, -143).lineTo(0, -52).stroke({ color: 0x9c825a, width: 2 });
    for (let i = 0; i < 6; i++) g.moveTo(-67, -115 + i * 10).lineTo(-13, -122 + i * 11).moveTo(15, -122 + i * 11).lineTo(69, -112 + i * 10).stroke({ color: 0x6b654d, width: 1.5, alpha: .6 });
    if (record) g.circle(51, -85, 19).stroke({ color: 0x8d4434, width: 3 }).poly([40, -86, 49, -78, 63, -94]).stroke({ color: 0x8d4434, width: 3 });
  }
  function radar(parent: Container): void {
    const g = shape(parent);
    g.ellipse(0, 0, 120, 16).fill({ color: P.ink, alpha: .5 }).poly([-112, -20, -95, -160, 95, -160, 112, -20]).fill(0x39403a).stroke({ color: 0x8e956f, width: 2 });
    g.circle(0, -92, 60).fill(0x0b221e).stroke({ color: 0x729878, width: 4 });
    for (const r of [18, 35, 51]) g.circle(0, -92, r).stroke({ color: P.green, alpha: .4, width: 1 });
    g.moveTo(-56, -92).lineTo(56, -92).moveTo(0, -147).lineTo(0, -37).stroke({ color: P.green, alpha: .4, width: 1 });
    const sweep = new Container(); sweep.position.set(0, -92); parent.addChild(sweep);
    shape(sweep).poly([0, 0, 49, -10, 54, 0]).fill({ color: P.green, alpha: .15 }).moveTo(0, 0).lineTo(54, 0).stroke({ color: P.green, width: 2, alpha: .8 });
    motion.push(t => { sweep.rotation = t * .6; });
    for (const x of [-83, 83]) g.circle(x, -49, 7).fill(P.gold).circle(x, -27, 4).fill(0x91a777);
  }
  function cabinet(parent: Container): void {
    const g = shape(parent);
    g.ellipse(0, 0, 115, 14).fill({ color: P.ink, alpha: .5 }).poly([-85, -42, 85, -42, 65, 0, -65, 0]).fill(0x453426).stroke({ color: P.gold, width: 2 });
    g.poly([-90, -178, 62, -178, 90, -157, -62, -157]).fill({ color: P.glass, alpha: .2 }).stroke({ color: P.edge, width: 2 });
    g.poly([-90, -178, -62, -157, -62, -46, -90, -65]).fill({ color: P.glass, alpha: .15 }).stroke({ color: P.edge, width: 1 });
    g.rect(-62, -157, 152, 111).fill({ color: 0xb1c9ba, alpha: .08 }).stroke({ color: P.edge, width: 2 });
    g.poly([-54, -151, -32, -151, 34, -52, 12, -52]).fill({ color: 0xd8e2c7, alpha: .14 }).rect(-80, -48, 174, 9).fill(P.gold);
    g.ellipse(8, -60, 32, 8).fill(0x735637).rect(-8, -29, 35, 8).fill(P.paper);
    const reflection = shape(parent).poly([-53, -150, -43, -150, 22, -53, 12, -53]).fill({ color: 0xecf2d6, alpha: .3 });
    motion.push(t => { reflection.alpha = .25 + Math.sin(t * .65) ** 2 * .55; reflection.x = Math.sin(t * .3) * 6; });
  }
  function trolley(parent: Container): void {
    const g = shape(parent);
    g.ellipse(0, 0, 115, 11).fill({ color: P.ink, alpha: .5 }).poly([-95, -51, 65, -51, 90, -26, -70, -26]).fill(0x70513a).stroke({ color: P.edge, width: 2 });
    g.moveTo(-77, -44).lineTo(-76, -140).lineTo(-38, -140).moveTo(70, -37).lineTo(71, -109).stroke({ color: P.gold, width: 7 });
    g.circle(-62, -12, 14).circle(72, -12, 14).fill(0x121516).stroke({ color: 0x9c8c69, width: 3 });
    g.poly([-48, -52, -50, -94, 34, -101, 38, -54]).fill(0x584c3d).stroke({ color: P.paper, width: 1, alpha: .4 });
  }
  function panel(parent: Container, photo = false): void {
    const g = shape(parent);
    g.ellipse(0, 0, 105, 12).fill({ color: P.ink, alpha: .4 }).poly([-83, -18, -70, -161, 72, -148, 86, -9]).fill(0x62462d).stroke({ color: P.edge, width: 3 });
    g.poly([-70, -29, -58, -146, 58, -136, 70, -24]).fill(photo ? 0x35413e : P.paper);
    if (photo) {
      g.poly([-58, -42, -34, -92, -2, -66, 26, -111, 59, -38]).fill(0x7c8a6b).circle(28, -117, 10).fill(0xc7b277);
    } else {
      for (let i = 0; i < 5; i++) g.moveTo(-43, -119 + i * 15).lineTo(43, -113 + i * 15).stroke({ color: 0x715c3f, width: i === 0 ? 4 : 2, alpha: .7 });
    }
    g.circle(0, -153, 3).fill(P.edge);
  }
  function makeObject(index: number): Container {
    const art = new Container();
    if (theme === "gallery") { if (index === 0) camera(art); else if (index === 1) panel(art); else book(art); }
    else if (theme === "festival") { if (index === 0) panel(art, true); else if (index === 1) cabinet(art); else if (index === 2) book(art); else if (index === 3) trolley(art); else book(art, true); }
    else { if (index === 0) { if (team === "B") book(art); else camera(art); } else if (index === 1) radar(art); else book(art, true); }
    return art;
  }
  return {
    root,
    objects(values, point, scale): void {
      const ids = new Set(values.map(item => item.id));
      for (const [id, item] of items) if (!ids.has(id)) { item.root.destroy({ children: true }); items.delete(id); }
      values.forEach((value, index) => {
        let item = items.get(value.id);
        if (!item) {
          const container = new Container(); container.label = value.id; container.eventMode = "static"; container.cursor = "pointer"; container.hitArea = new Rectangle(-125, -200, 250, 220); objects.addChild(container);
          const light = lamp(container, 0, -65, 270, .08);
          const rim = shape(container).ellipse(0, 5, 115, 19).stroke({ color: P.edge, width: 2, alpha: .65 }); rim.alpha = 0;
          if (theme !== "festival" || index !== 3) {
            const stand = shape(container);
            stand.poly([-112, 0, 89, -10, 111, 9, -92, 22]).fill(theme === "signal" ? 0x634d38 : 0x7c6550).stroke({ color: P.gold, width: 1.5, alpha: .7 });
            stand.poly([-92, 22, 111, 9, 110, 23, -92, 37]).fill(0x2e261f);
            stand.poly([-80, 35, -66, 34, -67, 64, -80, 65]).poly([73, 26, 88, 26, 86, 53, 73, 55]).fill(0x352d26);
          }
          const art = makeObject(index); container.addChild(art);
          container.on("pointerover", () => { hover = value.id; }).on("pointerout", () => { if (hover === value.id) hover = null; }).on("pointertap", () => { if (enabled) pick?.(value.id); });
          item = { root: container, art, light, rim, x: 0, y: 0, scale, found: value.found, phase: index * 1.4 }; items.set(value.id, item);
        }
        const at = point(value); item.x = at.x; item.y = at.y - 35; item.scale = scale; item.found = value.found;
        item.root.position.set(item.x, item.y); item.root.scale.set(scale); item.root.eventMode = enabled ? "static" : "none";
      });
    },
    interactive(value): void { enabled = value; for (const item of items.values()) item.root.eventMode = value ? "static" : "none"; },
    update(time): void {
      for (const update of motion) update(time);
      for (const [id, item] of items) {
        const over = id === hover && enabled;
        item.art.y += ((over ? -9 : 0) - item.art.y) * .18;
        item.art.rotation = over ? Math.sin(time * 1.4 + item.phase) * .012 : 0;
        item.light.alpha = over ? .3 : item.found ? .13 : .07;
        item.rim.alpha = over ? .9 : item.found ? .38 : 0;
      }
    },
    destroy(): void { items.clear(); motion.length = 0; },
  };
}
