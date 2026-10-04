import "./style.css";

import { unlockAudio } from "./audio";
import { Scene } from "./scene";

function requireCanvas(selector: string): HTMLCanvasElement {
  const canvas = document.querySelector<HTMLCanvasElement>(selector);
  if (!canvas) throw new Error(`Canvas not found: ${selector}`);
  return canvas;
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is not supported");
  return context;
}

const canvas = requireCanvas("#canvas");
const scene = new Scene(canvas, requireContext(canvas));
let audioReady: Promise<void> | undefined;

function addCircles(positions: ReadonlyArray<{ x: number; y: number }>): void {
  if (!audioReady) {
    audioReady = unlockAudio().catch((error: unknown) => {
      audioReady = undefined;
      console.error("Unable to start audio", error);
    });
  }

  positions.forEach((position) => scene.add(position));
}

function positionFromClientPoint(clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

window.addEventListener("resize", () => scene.resize());

canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    const positions = Array.from(event.changedTouches, (touch) =>
      positionFromClientPoint(touch.clientX, touch.clientY),
    );

    addCircles(positions);
  },
  { passive: false },
);

canvas.addEventListener("mousedown", (event) => {
  addCircles([positionFromClientPoint(event.clientX, event.clientY)]);
});

scene.resize();
