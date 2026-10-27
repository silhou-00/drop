// Dev-only tweak panel. Shows the Leva control panel that every useTweaks call fills,
// plus a "Copy values" button that puts the current values of every live folder on the
// clipboard as JSON, ready to paste into a token file. The root route loads this file
// lazily and only in dev, so it never reaches the production bundle.
import { useState } from "react";
import { Leva } from "leva";
import { Button } from "@/components/ui/button";
import { getTweakValues } from "@/lib/tweaks/use-tweaks.dev";

const COPIED_RESET_MS = 1500;

export function TweakPanel() {
    const [copied, setCopied] = useState(false);

    // clipboard copy
    async function handleCopy() {
        await navigator.clipboard.writeText(JSON.stringify(getTweakValues(), null, 4));
        setCopied(true);
        window.setTimeout(() => {
            setCopied(false);
        }, COPIED_RESET_MS);
    }

    return (
        <>
            <Leva titleBar={{ title: "Tweaks" }} collapsed={false} />
            <div className="fixed right-3 bottom-3 z-[1001]">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? "Copied" : "Copy values"}
                </Button>
            </div>
        </>
    );
}
