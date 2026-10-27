// Turns the logo image into a grid of cells for the ASCII renderer. The logo is
// cropped to its visible content, fitted into the grid, and each cell is sampled
// several times on an offscreen canvas. Each sample is classified by colour: black is
// a letter, red is the pin, near-white with a slight blue tint is the faint outline,
// and pure white is background. A cell takes the kind with the most coverage, and its
// darkness (0..1) is how much of the cell that kind covers.

export type LogoCellKind = "background" | "letter" | "pin" | "outline";
export type LogoCell = { kind: LogoCellKind; darkness: number };

// cells are taller than wide, matching monospace glyphs
export const CELL_ASPECT = 1.5;

const SAMPLES_X = 4;
const SAMPLES_Y = Math.round(SAMPLES_X * CELL_ASPECT);
const SAMPLES_PER_CELL = SAMPLES_X * SAMPLES_Y;
const ANALYSIS_SIZE = 256;
const CONTENT_PADDING = 0.04;
const MIN_COVERAGE = 0.12;
const DEFAULT_OUTLINE_THRESHOLD = 4;

type Box = { x: number; y: number; width: number; height: number };
type Sample = { letter: number; pin: number; outline: number };

function clamp01(value: number) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}

function context2d(width: number, height: number) {
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    return canvas.getContext("2d", { willReadFrequently: true });
}

// how strongly one pixel belongs to each kind
function classify(r: number, g: number, b: number, outlineThreshold: number): Sample {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const pin = clamp01((r - Math.max(g, b) - 60) / 100);
    const letter = pin > 0 ? 0 : clamp01((200 - lum) / 150);
    const outline = pin === 0 && letter === 0 && b - r >= outlineThreshold ? 1 : 0;

    return { letter, pin, outline };
}

// bounding box of everything that is not plain background, in image pixels
function contentBox(image: HTMLImageElement, outlineThreshold: number): Box {
    const ctx = context2d(ANALYSIS_SIZE, ANALYSIS_SIZE);
    const full = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };

    if (!ctx) {
        return full;
    }

    ctx.drawImage(image, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);

    const data = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE).data;
    let minX = ANALYSIS_SIZE;
    let minY = ANALYSIS_SIZE;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < ANALYSIS_SIZE; y++) {
        for (let x = 0; x < ANALYSIS_SIZE; x++) {
            const i = (y * ANALYSIS_SIZE + x) * 4;
            const sample = classify(data[i], data[i + 1], data[i + 2], outlineThreshold);

            if (sample.letter + sample.pin + sample.outline > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < 0) {
        return full;
    }

    const scaleX = image.naturalWidth / ANALYSIS_SIZE;
    const scaleY = image.naturalHeight / ANALYSIS_SIZE;

    return {
        x: minX * scaleX,
        y: minY * scaleY,
        width: (maxX - minX + 1) * scaleX,
        height: (maxY - minY + 1) * scaleY,
    };
}

// draws the cropped logo centred and contained in the sample canvas
function drawFitted(ctx: CanvasRenderingContext2D, image: HTMLImageElement, box: Box, width: number, height: number) {
    const innerWidth = width * (1 - CONTENT_PADDING * 2);
    const innerHeight = height * (1 - CONTENT_PADDING * 2);
    const scale = Math.min(innerWidth / box.width, innerHeight / box.height);
    const drawWidth = box.width * scale;
    const drawHeight = box.height * scale;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
        image,
        box.x,
        box.y,
        box.width,
        box.height,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
    );
}

function toCell(sum: Sample): LogoCell {
    const best = Math.max(sum.letter, sum.pin, sum.outline);
    const darkness = best / SAMPLES_PER_CELL;

    if (darkness < MIN_COVERAGE) {
        return { kind: "background", darkness: 0 };
    }

    if (best === sum.pin) {
        return { kind: "pin", darkness };
    }

    if (best === sum.letter) {
        return { kind: "letter", darkness };
    }

    return { kind: "outline", darkness };
}

export function sampleLogo(
    image: HTMLImageElement,
    cols: number,
    rows: number,
    outlineThreshold = DEFAULT_OUTLINE_THRESHOLD,
): LogoCell[] {
    const width = cols * SAMPLES_X;
    const height = rows * SAMPLES_Y;
    const ctx = context2d(width, height);
    const cells: LogoCell[] = [];

    if (!ctx || cols < 1 || rows < 1) {
        return cells;
    }

    drawFitted(ctx, image, contentBox(image, outlineThreshold), width, height);

    const data = ctx.getImageData(0, 0, width, height).data;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const sum: Sample = { letter: 0, pin: 0, outline: 0 };

            for (let sy = 0; sy < SAMPLES_Y; sy++) {
                for (let sx = 0; sx < SAMPLES_X; sx++) {
                    const i = ((row * SAMPLES_Y + sy) * width + col * SAMPLES_X + sx) * 4;
                    const sample = classify(data[i], data[i + 1], data[i + 2], outlineThreshold);

                    sum.letter += sample.letter;
                    sum.pin += sample.pin;
                    sum.outline += sample.outline;
                }
            }

            cells.push(toCell(sum));
        }
    }

    return cells;
}
