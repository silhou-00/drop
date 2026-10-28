// Marbled bath background. Fills its positioned parent with the live marble shader for
// the given zone (content, chrome or hero), drawn over a still WebP poster of the same
// bath, which is the first paint. The still stays on its own when the device asks for
// reduced motion or the renderer reports a failure (no WebGL, shader error, lost context,
// slow frames). Light or dark follows the colour tokens. In the content zone a ground
// veil fades the bath out from the top edge so text and cards sit on near-plain ground.
// The bath is decoration only: it is hidden from screen readers and takes no pointer input.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { cssEasing } from "@/lib/motion/easings";
import { motionDefaults } from "@/lib/motion/tokens";
import { createMarble, type MarbleHandle } from "@/lib/marble/renderer";
import {
    marbleDefaults,
    marbleSchema,
    type MarbleMode,
    type MarbleVariant,
    type MarbleZone,
} from "@/lib/marble/tokens";
import { useTweaks } from "@/lib/tweaks/use-tweaks";

type MarbleBackgroundProps = { variant?: MarbleVariant; intensity?: MarbleZone; className?: string };

const DARK_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const LANDSCAPE_QUERY = "(min-aspect-ratio: 1/1)";

// colour mode: device setting, overridden by data-theme on the root
function subscribeMode(onChange: () => void) {
    const media = window.matchMedia(DARK_QUERY);
    const observer = new MutationObserver(onChange);

    media.addEventListener("change", onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
        media.removeEventListener("change", onChange);
        observer.disconnect();
    };
}

function getMode(): MarbleMode {
    return getComputedStyle(document.documentElement).colorScheme === "dark" ? "dark" : "light";
}

function subscribeReduced(onChange: () => void) {
    const media = window.matchMedia(REDUCED_QUERY);

    media.addEventListener("change", onChange);

    return () => {
        media.removeEventListener("change", onChange);
    };
}

function getReduced() {
    return window.matchMedia(REDUCED_QUERY).matches;
}

export function MarbleBackground({ variant = "comb", intensity = "chrome", className }: MarbleBackgroundProps) {
    const tokens = useTweaks("Marble", marbleDefaults, marbleSchema);
    const mode = useSyncExternalStore(subscribeMode, getMode);
    const reduced = useSyncExternalStore(subscribeReduced, getReduced);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const handleRef = useRef<MarbleHandle | null>(null);
    const latestRef = useRef({ tokens, zone: intensity, mode });
    const [failed, setFailed] = useState(false);
    const [live, setLive] = useState(false);
    const { shaderFadeIn } = motionDefaults;
    const showCanvas = !reduced && !failed;
    const still = `/marble/${variant}`;

    // latest values, read when the renderer is created; later changes go through setUniforms
    useEffect(() => {
        latestRef.current = { tokens, zone: intensity, mode };
        handleRef.current?.setUniforms(latestRef.current);
    }, [tokens, intensity, mode]);

    // created once per motion setting
    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || !showCanvas) {
            return;
        }

        const { tokens: initialTokens, zone, mode: initialMode } = latestRef.current;
        const handle = createMarble(canvas, initialTokens, {
            zone,
            mode: initialMode,
            driftPeriod: motionDefaults.marbleDrift.duration,
            onFail: () => {
                setFailed(true);
            },
        });

        if (!handle) {
            setFailed(true);

            return;
        }

        handleRef.current = handle;
        setLive(true);

        return () => {
            handle.destroy();
            handleRef.current = null;
            setLive(false);
        };
    }, [showCanvas]);

    return (
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
            <picture>
                <source media={LANDSCAPE_QUERY} srcSet={`${still}-land-${mode}.webp`} />
                <img src={`${still}-port-${mode}.webp`} alt="" className="absolute inset-0 size-full object-cover" />
            </picture>
            {showCanvas ? (
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 size-full"
                    style={{
                        opacity: live ? 1 : 0,
                        transition: `opacity ${shaderFadeIn.duration}ms ${cssEasing(shaderFadeIn.easing)}`,
                    }}
                />
            ) : null}
            {intensity === "content" ? (
                <div
                    className="absolute inset-0 bg-ground"
                    style={{
                        opacity: tokens.contentFade,
                        maskImage: `linear-gradient(to bottom, transparent 0, black ${tokens.fadeLength}px)`,
                    }}
                />
            ) : null}
        </div>
    );
}
