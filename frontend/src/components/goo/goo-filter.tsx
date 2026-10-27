// Gooey effect. GooFilter renders an SVG filter that blurs whatever it is applied to
// and then sharpens the blurred alpha channel, so shapes that come close melt into
// one blob. Goo applies that filter to its children. With crisp on, the original
// content is drawn back on top so text and edges inside the blob stay sharp.
//
// Source: built from the standard SVG goo technique (blur, then an alpha colour
// matrix) and from the observed behaviour of the free Skiper UI "Gooey Effect"
// (skiper64). No Skiper UI code was copied: its site terms forbid copying material
// and the component page does not show its filter internals.
import type { ReactNode } from "react";
import { useTweaks } from "@/lib/tweaks/use-tweaks";
import { gooDefaults, gooSchema } from "@/lib/goo/tokens";

type GooFilterProps = { id: string; crisp?: boolean };
type GooProps = { id: string; className?: string; children: ReactNode };

export function GooFilter({ id, crisp = false }: GooFilterProps) {
    const goo = useTweaks("Goo", gooDefaults, gooSchema);
    const matrix = `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${goo.alphaContrast} ${goo.alphaOffset}`;

    return (
        <svg aria-hidden="true" className="pointer-events-none absolute size-0 overflow-hidden">
            <defs>
                <filter id={id}>
                    <feGaussianBlur in="SourceGraphic" stdDeviation={goo.blur} result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values={matrix} result="goo" />
                    {crisp ? <feComposite in="SourceGraphic" in2="goo" operator="atop" /> : null}
                </filter>
            </defs>
        </svg>
    );
}

export function Goo({ id, className, children }: GooProps) {
    return (
        <div className={className} style={{ filter: `url(#${id})` }}>
            {children}
        </div>
    );
}
