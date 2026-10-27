// Animated ASCII version of the Drop logo. Loads the logo image, then starts the
// ASCII engine on a canvas with the current token values; later value changes (from
// the tweak panel in dev) are applied live without restarting the engine. The canvas
// is hidden from screen readers, which read the visually hidden "Drop" label instead.
import { useEffect, useRef } from "react";
import { AsciiLogoEngine } from "@/lib/ascii-logo/engine";
import { asciiLogoDefaults, asciiLogoSchema } from "@/lib/ascii-logo/tokens";
import { useTweaks } from "@/lib/tweaks/use-tweaks";

const LOGO_SRC = "/brand/logo.jpg";

type AsciiLogoProps = { className?: string };

export function AsciiLogo({ className }: AsciiLogoProps) {
    const params = useTweaks("ASCII logo", asciiLogoDefaults, asciiLogoSchema);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<AsciiLogoEngine | null>(null);
    const paramsRef = useRef(params);

    // engine lifetime: one per mounted canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const image = new Image();
        let cancelled = false;

        if (!canvas) {
            return;
        }

        image.onload = () => {
            if (!cancelled) {
                engineRef.current = new AsciiLogoEngine(canvas, image, paramsRef.current);
            }
        };
        image.src = LOGO_SRC;

        return () => {
            cancelled = true;
            engineRef.current?.destroy();
            engineRef.current = null;
        };
    }, []);

    // live token changes
    useEffect(() => {
        paramsRef.current = params;
        engineRef.current?.setParams(params);
    }, [params]);

    return (
        <>
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                className={`block aspect-[2/1] w-full font-mono ${className ?? ""}`}
            />
            <span className="sr-only">Drop</span>
        </>
    );
}
