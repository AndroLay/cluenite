import { Application, Assets, Container, Graphics, Sprite } from "pixi.js";
import museumGalleryUrl from "../assets/mystery-live/museum-gallery.png";

export interface MysteryLiveScene {
  focusClue(clueId: string | null): void;
  destroy(): void;
}

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;

const FOCUS_BOXES: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {
  PHOTO: { x: 385, y: 140, width: 345, height: 430 },
  CASE: { x: 370, y: 135, width: 375, height: 450 },
  ACCESS: { x: 1080, y: 250, width: 300, height: 240 },
  TROLLEY: { x: 780, y: 305, width: 330, height: 350 },
  WORK_ORDER: { x: 930, y: 240, width: 360, height: 300 },
};

export async function createMysteryLiveScene(
  host: HTMLElement,
): Promise<MysteryLiveScene> {
  const app = new Application();
  await app.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });

  const canvas = app.canvas;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  app.ticker.stop();

  const world = new Container();
  app.stage.addChild(world);
  const texture = await Assets.load(museumGalleryUrl);
  const background = new Sprite(texture);
  background.width = WORLD_WIDTH;
  background.height = WORLD_HEIGHT;
  world.addChild(background);

  const colorGrade = new Graphics()
    .rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    .fill({ color: 0x100d0a, alpha: 0.12 });
  world.addChild(colorGrade);

  const focusFrame = new Graphics();
  focusFrame.eventMode = "none";
  world.addChild(focusFrame);

  const fit = (): void => {
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    app.renderer.resize(width, height);
    const scale = Math.max(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    world.scale.set(scale);
    world.position.set(
      (width - WORLD_WIDTH * scale) / 2,
      (height - WORLD_HEIGHT * scale) / 2,
    );
    app.render();
  };
  const resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(host);
  fit();

  return {
    focusClue(clueId): void {
      focusFrame.clear();
      const box = clueId === null ? undefined : FOCUS_BOXES[clueId];
      if (!box) {
        app.render();
        return;
      }
      focusFrame
        .roundRect(box.x, box.y, box.width, box.height, 4)
        .stroke({ color: 0xd9b681, alpha: 0.92, width: 2 });
      focusFrame
        .roundRect(box.x + 7, box.y + 7, box.width - 14, box.height - 14, 2)
        .stroke({ color: 0xe9decb, alpha: 0.28, width: 1 });
      app.render();
    },
    destroy(): void {
      resizeObserver.disconnect();
      app.destroy(true, {
        children: true,
        texture: false,
        textureSource: false,
      });
      canvas.remove();
    },
  };
}
