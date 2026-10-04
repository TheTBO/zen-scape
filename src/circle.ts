import { Voice } from "./audio";

export type Point = Readonly<{ x: number; y: number }>;
export type Viewport = Readonly<{ width: number; height: number }>;

type Color = CanvasFillStrokeStyles["fillStyle"];
type Wave = Readonly<{
  amplitude: number;
  frequency: number;
  speed: number;
  direction: 1 | -1;
}>;

const GROWTH_MILLISECONDS_PER_PIXEL = 10;
const TWO_PI = Math.PI * 2;
const ANGLE_STEP = 0.03;

function createWaves(direction: 1 | -1): Wave[] {
  const count = Math.ceil(Math.random() * 4 + 1);

  return Array.from({ length: count }, () => ({
    direction,
    speed: (Math.random() * 8 + 7) / 10,
    frequency: Math.floor(Math.random() * 8) + 2,
    amplitude: (Math.random() * 2 + 1) / 100,
  }));
}

export class Circle {
  readonly color: Color;

  private radius = 0;
  private readonly position: Point;
  private readonly createdAt: DOMHighResTimeStamp;
  private readonly waves = [...createWaves(1), ...createWaves(-1)];
  private readonly voice: Voice;

  constructor(
    position: Point,
    hue: number,
    createdAt: DOMHighResTimeStamp,
    viewport: Viewport,
  ) {
    this.position = position;
    this.createdAt = createdAt;
    this.color = `hsl(${hue}, 72%, 68%)`;
    this.voice = new Voice({
      ...position,
      hue,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });
  }

  start(): void {
    this.voice.start();
  }

  update(
    timestamp: DOMHighResTimeStamp,
    mixedVoiceCount: number,
    viewport: Viewport,
  ): void {
    this.radius = Math.max(
      0,
      (timestamp - this.createdAt) / GROWTH_MILLISECONDS_PER_PIXEL,
    );
    this.rebalance(mixedVoiceCount, viewport);
  }

  draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    const frame =
      (timestamp - this.createdAt) / GROWTH_MILLISECONDS_PER_PIXEL / 100;

    ctx.beginPath();
    ctx.fillStyle = this.color;

    for (let angle = 0; angle <= TWO_PI; angle += ANGLE_STEP) {
      const radius = this.radius + this.rippleOffset(frame, angle);
      const x = this.position.x + radius * Math.cos(angle);
      const y = this.position.y + radius * Math.sin(angle);

      if (angle === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }

  covers(viewport: Viewport): boolean {
    return this.radius > Math.max(viewport.width, viewport.height);
  }

  rebalance(mixedVoiceCount: number, viewport: Viewport): void {
    this.voice.rebalance(
      mixedVoiceCount,
      this.radius,
      Math.max(viewport.width, viewport.height),
    );
  }

  release(onTailEnded: () => void): void {
    this.voice.release(onTailEnded);
  }

  private rippleOffset(frame: number, angle: number): number {
    let offset = 0;

    for (const wave of this.waves) {
      const phase = angle + wave.direction * (frame / wave.speed);
      offset += this.radius * wave.amplitude * Math.sin(wave.frequency * phase);
    }

    return offset;
  }
}
