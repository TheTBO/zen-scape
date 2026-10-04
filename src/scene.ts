import { Circle, type Point, type Viewport } from "./circle";
import { shouldCreateVoice } from "./load-policy";

type Color = CanvasFillStrokeStyles["fillStyle"];

const BACKGROUND_COLOR: Color = "hsl(45, 70%, 96%)";

export class Scene {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private circles: Circle[] = [];
  private backgroundColor: Color = BACKGROUND_COLOR;
  private soundingCircleCount = 0;
  private releasingVoiceCount = 0;
  private animationFrameId: number | undefined;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.paintBackground();
  }

  add(position: Point): void {
    const soundingBlobCount =
      this.soundingCircleCount + this.releasingVoiceCount;
    const circle = new Circle(
      position,
      Math.random() * 360,
      performance.now(),
      this.viewport,
      shouldCreateVoice(soundingBlobCount),
    );

    this.circles.push(circle);
    if (circle.isSounding) this.soundingCircleCount += 1;
    this.updateMix();
    circle.start();
    this.requestFrame();
  }

  private get viewport(): Viewport {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  private requestFrame(): void {
    this.animationFrameId ??= requestAnimationFrame(this.renderFrame);
  }

  private readonly renderFrame = (timestamp: DOMHighResTimeStamp): void => {
    this.animationFrameId = undefined;
    this.paintBackground();

    const viewport = this.viewport;
    const mixedVoiceCount =
      this.soundingCircleCount + this.releasingVoiceCount;
    const blobCount = this.circles.length;
    const remaining: Circle[] = [];

    for (const circle of this.circles) {
      circle.update(timestamp, mixedVoiceCount, viewport);
      circle.draw(this.ctx, timestamp, blobCount);

      if (circle.covers(viewport)) this.release(circle);
      else remaining.push(circle);
    }

    this.circles = remaining;
    this.updateMix();

    if (this.circles.length > 0) this.requestFrame();
  };

  private release(circle: Circle): void {
    this.backgroundColor = circle.color;
    if (!circle.isSounding) return;

    this.soundingCircleCount = Math.max(0, this.soundingCircleCount - 1);
    this.releasingVoiceCount += 1;
    circle.release(() => {
      this.releasingVoiceCount = Math.max(0, this.releasingVoiceCount - 1);
      this.updateMix();
    });
  }

  private updateMix(): void {
    const mixedVoiceCount =
      this.soundingCircleCount + this.releasingVoiceCount;
    const viewport = this.viewport;
    this.circles.forEach((circle) =>
      circle.rebalance(mixedVoiceCount, viewport),
    );
  }

  private paintBackground(): void {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
