import type { HeatmapData } from "@/lib/types";

export const HEATMAP_GRID_W = 40;
export const HEATMAP_GRID_H = 30;

export class DeviationHeatmap {
  private cells: Float32Array;
  private readonly width: number;
  private readonly height: number;

  constructor(
    width = HEATMAP_GRID_W,
    height = HEATMAP_GRID_H
  ) {
    this.width = width;
    this.height = height;
    this.cells = new Float32Array(width * height);
  }

  reset(): void {
    this.cells.fill(0);
  }

  recordDeviation(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    intensity: number
  ): void {
    const col = Math.floor((x / canvasWidth) * this.width);
    const row = Math.floor((y / canvasHeight) * this.height);
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) return;
    const idx = row * this.width + col;
    this.cells[idx] += intensity;
  }

  toData(): HeatmapData {
    let max = 0.001;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] > max) max = this.cells[i];
    }
    return {
      width: this.width,
      height: this.height,
      cells: Array.from(this.cells, (v) => v / max),
    };
  }

  renderToCanvas(
    canvas: HTMLCanvasElement,
    pathOverlay?: { width: number; height: number }
  ): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellW = canvas.width / this.width;
    const cellH = canvas.height / this.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let maxCell = 0.001;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] > maxCell) maxCell = this.cells[i];
    }

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const v = this.cells[row * this.width + col];
        if (v <= 0.02) continue;
        const norm = v / maxCell;
        const alpha = 0.15 + norm * 0.45;
        const r = Math.round(220 + norm * 35);
        const g = Math.round(140 - norm * 80);
        const b = Math.round(80 - norm * 40);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
      }
    }

    if (pathOverlay) {
      ctx.strokeStyle = "rgba(3, 105, 161, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
      ctx.setLineDash([]);
    }
  }
}

export function renderHeatmapFromData(
  canvas: HTMLCanvasElement,
  data: HeatmapData
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cellW = canvas.width / data.width;
  const cellH = canvas.height / data.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f8fafb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < data.cells.length; i++) {
    const v = data.cells[i];
    if (v < 0.05) continue;
    const col = i % data.width;
    const row = Math.floor(i / data.width);
    const alpha = 0.12 + v * 0.5;
    const r = Math.round(210 + v * 45);
    const g = Math.round(130 - v * 70);
    const b = Math.round(90 - v * 50);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
  }
}
