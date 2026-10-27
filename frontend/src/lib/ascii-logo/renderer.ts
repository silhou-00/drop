// Draws the ASCII logo onto a canvas as a grid of monospace glyphs. The canvas is
// sized for the device pixel ratio, each logo cell picks a glyph from the density ramp
// by its darkness (thin edge cells and the outline use the edge characters), and it is
// coloured by its kind: letter, pin, or outline. Cells are drawn at their home
// position plus the motion field's offset and idle wobble.
//
// Adapted from the drawing core of ascii-sharks (src/renderer.ts and src/math.ts),
// MIT licence, github.com/stackedlol/ascii-sharks. Licence text in LICENSE-ascii-sharks.
import type { LogoField } from "./field";
import { CELL_ASPECT, type LogoCell } from "./mask";
import type { AsciiLogoTokens } from "./tokens";

type RenderParams = { grid: AsciiLogoTokens["grid"]; colors: AsciiLogoTokens["colors"] };

const EDGE_DARKNESS = 0.45;
const FONT_SCALE = 0.74;
const DEFAULT_FONT = "ui-monospace, Menlo, monospace";

// cheap integer hash to [0, 1), stable per cell so textures do not flicker
function hash3(x: number, y: number, z: number) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);

    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;

    return (h >>> 0) / 4294967296;
}

export class AsciiRenderer {
    cols = 0;
    rows = 0;
    cellWidth = 10;
    cellHeight = 15;

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dpr = 1;
    private width = 0;
    private height = 0;
    private fontFamily = DEFAULT_FONT;

    constructor(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext("2d", { alpha: false });

        if (!ctx) {
            throw new Error("2D canvas unavailable");
        }

        this.canvas = canvas;
        this.ctx = ctx;
    }

    setFontFamily(family: string) {
        if (family) {
            this.fontFamily = family;
        }
    }

    resize(width: number, height: number, dpr: number, cellSize: number) {
        this.width = width;
        this.height = height;
        this.dpr = dpr;
        this.cellWidth = cellSize;
        this.cellHeight = Math.round(cellSize * CELL_ASPECT);
        this.cols = Math.ceil(width / this.cellWidth);
        this.rows = Math.ceil(height / this.cellHeight);
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
    }

    // glyph for one cell from its darkness, jittered so flat areas get texture
    private glyphFor(cell: LogoCell, index: number, grid: RenderParams["grid"]) {
        const ramp = grid.densityRamp || "@";
        const edge = grid.edgeChars || ".";
        const key = hash3(index % this.cols, (index / this.cols) | 0, 7);

        // the faint outline always reads as light edge characters
        if (cell.kind === "outline" || cell.darkness < EDGE_DARKNESS) {
            return edge[Math.floor(key * edge.length)];
        }

        const jitter = Math.floor(key * 3) - 1;
        const level = Math.floor(cell.darkness * (ramp.length - 0.01)) + jitter;

        return ramp[Math.min(ramp.length - 1, Math.max(0, level))];
    }

    render(cells: LogoCell[], field: LogoField, params: RenderParams) {
        const { ctx, dpr, cellWidth, cellHeight } = this;
        const colorByKind = { letter: params.colors.letters, pin: params.colors.pin, outline: params.colors.outline };

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = params.colors.background;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.font = `${params.grid.fontWeight} ${Math.round(cellHeight * FONT_SCALE)}px ${this.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];

            if (cell.kind === "background") {
                continue;
            }

            const col = i % this.cols;
            const row = (i / this.cols) | 0;
            const wobble = field.wobble(i);
            const x = (col + 0.5) * cellWidth + (field.offsetX[i] ?? 0);
            const y = (row + 0.5) * cellHeight + (field.offsetY[i] ?? 0) + wobble + 1;

            ctx.fillStyle = colorByKind[cell.kind];
            ctx.fillText(this.glyphFor(cell, i, params.grid), x, y);
        }
    }
}
