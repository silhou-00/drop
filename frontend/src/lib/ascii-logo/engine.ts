// Runs the ASCII logo on a canvas: a fixed-timestep loop (60 steps a second, at most
// 4 per frame), resizing with the canvas, pausing while off-screen, and pointer input
// (hover melts, press ripples). With prefers-reduced-motion it draws one still frame
// and never starts the loop. setParams applies new token values live, rebuilding the
// grid only when the cell size or outline threshold changed. destroy removes it all.
//
// Adapted from ascii-sharks (src/engine.ts), MIT licence,
// github.com/stackedlol/ascii-sharks. Licence text in LICENSE-ascii-sharks.
import { LogoField } from "./field";
import { sampleLogo, type LogoCell } from "./mask";
import { AsciiRenderer } from "./renderer";
import type { AsciiLogoTokens } from "./tokens";

const STEP = 1 / 60;
const MAX_STEPS = 4;
const MAX_FRAME_SECONDS = 0.1;
const MAX_DPR = 2;

export class AsciiLogoEngine {
    private canvas: HTMLCanvasElement;
    private image: HTMLImageElement;
    private params: AsciiLogoTokens;
    private field: LogoField;
    private renderer: AsciiRenderer;
    private cells: LogoCell[] = [];
    private raf = 0;
    private last = 0;
    private acc = 0;
    private visible = true;
    private disposed = false;
    private reducedMotion: MediaQueryList;
    private resizeObserver: ResizeObserver;
    private intersectionObserver: IntersectionObserver;

    constructor(canvas: HTMLCanvasElement, image: HTMLImageElement, params: AsciiLogoTokens) {
        this.canvas = canvas;
        this.image = image;
        this.params = params;
        this.field = new LogoField({ ...params.melt, ...params.idle });
        this.renderer = new AsciiRenderer(canvas);
        this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
        this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas);
        this.intersectionObserver = new IntersectionObserver(([entry]) => {
            this.visible = entry.isIntersecting;
            this.schedule();
        });
        this.intersectionObserver.observe(canvas);
        this.reducedMotion.addEventListener("change", this.onMotionPreference);
        window.addEventListener("pointermove", this.onPointerMove, { passive: true });
        window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
        window.addEventListener("pointerup", this.onPointerUp, { passive: true });
        window.addEventListener("pointercancel", this.onPointerLeave);
        document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
        window.addEventListener("blur", this.onPointerLeave);
        this.resize();

        // canvas text cannot trigger a webfont load, so redraw once the face is in
        document.fonts?.load(`600 16px ${getComputedStyle(canvas).fontFamily}`).then(() => {
            if (!this.disposed) {
                this.draw();
            }
        });

        this.schedule();
    }

    setParams(params: AsciiLogoTokens) {
        const previous = this.params;
        const relayout =
            previous.grid.cellSize !== params.grid.cellSize ||
            previous.grid.outlineThreshold !== params.grid.outlineThreshold;

        this.params = params;
        this.field.params = { ...params.melt, ...params.idle };

        if (relayout) {
            this.resize();
        } else {
            this.draw();
        }
    }

    destroy() {
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        this.resizeObserver.disconnect();
        this.intersectionObserver.disconnect();
        this.reducedMotion.removeEventListener("change", this.onMotionPreference);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("pointerdown", this.onPointerDown);
        window.removeEventListener("pointerup", this.onPointerUp);
        window.removeEventListener("pointercancel", this.onPointerLeave);
        document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
        window.removeEventListener("blur", this.onPointerLeave);
    }

    private resize() {
        const rect = this.canvas.getBoundingClientRect();

        if (rect.width < 1 || rect.height < 1) {
            return;
        }

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const { renderer } = this;

        renderer.resize(rect.width, rect.height, dpr, this.params.grid.cellSize);
        this.field.resize(renderer.cols, renderer.rows, renderer.cellWidth, renderer.cellHeight);
        this.cells = sampleLogo(this.image, renderer.cols, renderer.rows, this.params.grid.outlineThreshold);
        if (this.reducedMotion.matches) {
            this.drawStill();
        } else {
            this.draw();
        }
    }

    // one frame from the current state, used on resize, param change and reduced motion
    private draw() {
        this.renderer.render(this.cells, this.field, this.params);
    }

    private schedule() {
        cancelAnimationFrame(this.raf);

        if (this.disposed || !this.visible || this.reducedMotion.matches) {
            return;
        }

        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
    }

    private frame = (now: number) => {
        const dt = Math.min(MAX_FRAME_SECONDS, (now - this.last) / 1000);
        let steps = 0;

        this.last = now;
        this.acc += dt;

        while (this.acc >= STEP && steps < MAX_STEPS) {
            this.field.step(STEP);
            this.acc -= STEP;
            steps++;
        }

        if (steps === MAX_STEPS) {
            this.acc = 0;
        }

        this.draw();
        this.raf = requestAnimationFrame(this.frame);
    };

    // reduced motion: settle the field at rest and show a single frame
    private drawStill() {
        this.field.resize(this.renderer.cols, this.renderer.rows, this.renderer.cellWidth, this.renderer.cellHeight);
        this.field.idleMix = 0;
        this.draw();
    }

    private onMotionPreference = () => {
        if (this.reducedMotion.matches) {
            cancelAnimationFrame(this.raf);
            this.drawStill();
        } else {
            this.schedule();
        }
    };

    private toLocal(event: PointerEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

        return { x, y, inside };
    }

    private onPointerMove = (event: PointerEvent) => {
        const { x, y, inside } = this.toLocal(event);
        const pointer = this.field.pointer;

        pointer.x = x;
        pointer.y = y;
        pointer.active = inside && !this.reducedMotion.matches;
    };

    private onPointerDown = (event: PointerEvent) => {
        const { x, y, inside } = this.toLocal(event);

        if (inside && !this.reducedMotion.matches) {
            this.field.ripple(x, y);
        }
    };

    // a lifted finger stops melting; a mouse keeps hovering
    private onPointerUp = (event: PointerEvent) => {
        if (event.pointerType === "touch") {
            this.field.pointer.active = false;
        }
    };

    private onPointerLeave = () => {
        this.field.pointer.active = false;
    };
}
