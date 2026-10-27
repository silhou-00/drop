// Motion field for the ASCII logo. Every grid cell has an offset from its home
// position and a velocity. Cells near the pointer melt: gravity pulls them down, drag
// slows them, and the drip is capped at the drip length. Away from the pointer a
// spring pulls each cell back home. A pointer press sends out a ripple ring that pushes
// cells outward as it passes, and when nobody touches the logo it wobbles gently.
import type { AsciiLogoTokens } from "./tokens";

export type FieldParams = AsciiLogoTokens["melt"] & AsciiLogoTokens["idle"];
export type FieldPointer = { x: number; y: number; active: boolean };

type Ripple = { x: number; y: number; radius: number };

const RIPPLE_BAND = 24;
const IDLE_FADE_PER_SECOND = 1.5;

export class LogoField {
    offsetX = new Float32Array(0);
    offsetY = new Float32Array(0);
    pointer: FieldPointer = { x: 0, y: 0, active: false };
    idleMix = 1;
    time = 0;

    private velocityX = new Float32Array(0);
    private velocityY = new Float32Array(0);
    private ripples: Ripple[] = [];
    private cols = 0;
    private rows = 0;
    private cellWidth = 1;
    private cellHeight = 1;
    private reach = 0;

    params: FieldParams;

    constructor(params: FieldParams) {
        this.params = params;
    }

    resize(cols: number, rows: number, cellWidth: number, cellHeight: number) {
        const count = cols * rows;

        this.cols = cols;
        this.rows = rows;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
        this.reach = Math.hypot(cols * cellWidth, rows * cellHeight);
        this.offsetX = new Float32Array(count);
        this.offsetY = new Float32Array(count);
        this.velocityX = new Float32Array(count);
        this.velocityY = new Float32Array(count);
        this.ripples = [];
    }

    ripple(x: number, y: number) {
        this.ripples.push({ x, y, radius: 0 });
    }

    // idle wobble for one cell, already scaled by how idle the logo is
    wobble(index: number) {
        const { wobbleAmount, wobbleSpeed } = this.params;
        const col = index % this.cols;
        const row = (index / this.cols) | 0;
        const phase = col * 0.35 + row * 0.6;

        return Math.sin(this.time * wobbleSpeed * Math.PI * 2 + phase) * wobbleAmount * this.idleMix;
    }

    step(dt: number) {
        const params = this.params;
        const damping = Math.exp(-params.drag * dt);
        const idleTarget = this.pointer.active ? 0 : 1;

        this.time += dt;
        this.idleMix += (idleTarget - this.idleMix) * Math.min(1, IDLE_FADE_PER_SECOND * dt);
        this.advanceRipples(dt);

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.stepCell(row * this.cols + col, col, row, dt, damping);
            }
        }
    }

    private advanceRipples(dt: number) {
        for (const ripple of this.ripples) {
            ripple.radius += this.params.rippleSpeed * dt;
        }

        this.ripples = this.ripples.filter((ripple) => ripple.radius < this.reach);
    }

    // how much a cell at this home position is melting, 0..meltStrength
    private meltAt(homeX: number, homeY: number) {
        const { pointerRadius, meltStrength } = this.params;

        if (!this.pointer.active || pointerRadius <= 0) {
            return 0;
        }

        const distance = Math.hypot(this.pointer.x - homeX, this.pointer.y - homeY);

        if (distance >= pointerRadius) {
            return 0;
        }

        const falloff = 1 - distance / pointerRadius;

        return falloff * falloff * meltStrength;
    }

    private rippleForce(i: number, homeX: number, homeY: number, dt: number) {
        for (const ripple of this.ripples) {
            const dx = homeX - ripple.x;
            const dy = homeY - ripple.y;
            const distance = Math.hypot(dx, dy) || 1;
            const band = Math.abs(distance - ripple.radius);

            if (band < RIPPLE_BAND) {
                const push = (1 - band / RIPPLE_BAND) * this.params.rippleStrength * dt * 10;

                this.velocityX[i] += (dx / distance) * push;
                this.velocityY[i] += (dy / distance) * push;
            }
        }
    }

    private stepCell(i: number, col: number, row: number, dt: number, damping: number) {
        const params = this.params;
        const homeX = (col + 0.5) * this.cellWidth;
        const homeY = (row + 0.5) * this.cellHeight;
        const melt = this.meltAt(homeX, homeY);
        const spring = params.springBack * Math.max(0, 1 - melt);

        this.velocityX[i] += -spring * this.offsetX[i] * dt;
        this.velocityY[i] += (params.gravity * melt - spring * this.offsetY[i]) * dt;
        this.rippleForce(i, homeX, homeY, dt);
        this.velocityX[i] *= damping;
        this.velocityY[i] *= damping;
        this.offsetX[i] += this.velocityX[i] * dt;
        this.offsetY[i] += this.velocityY[i] * dt;

        if (this.offsetY[i] > params.dripLength) {
            this.offsetY[i] = params.dripLength;
            this.velocityY[i] = Math.min(0, this.velocityY[i]);
        }
    }
}
