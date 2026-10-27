// Dev-only playground page for the gooey filter. A static blob and a draggable blob
// sit inside the filter; dragging one into the other shows them melt together, and the
// blur and alpha values can be tuned in the tweak panel. Outside the dev server the
// route answers "not found".
import { useRef, useState, type PointerEvent } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Goo, GooFilter } from "@/components/goo/goo-filter";

const FILTER_ID = "playground-goo";
const START = { x: 0.68, y: 0.5 };

export const Route = createFileRoute("/playground/goo")({
    beforeLoad: () => {
        if (!import.meta.env.DEV) {
            throw notFound();
        }
    },
    component: GooPlayground,
});

function GooPlayground() {
    const areaRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(START);
    const [dragging, setDragging] = useState(false);

    // drag handling, stored as a fraction of the area so it survives resizes
    function moveTo(event: PointerEvent<HTMLDivElement>) {
        const rect = areaRef.current?.getBoundingClientRect();

        if (!rect) {
            return;
        }

        setPosition({
            x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
        });
    }

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        moveTo(event);
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        if (dragging) {
            moveTo(event);
        }
    }

    return (
        <main>
            <GooFilter id={FILTER_ID} />

            {/* goo section */}
            <section className="section">
                {/* heading row */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h1 className="text-heading font-semibold">Goo</h1>
                        </div>
                    </div>
                    <div className="placement">
                        <div className="container">
                            <p className="text-body text-muted-foreground">
                                Drag anywhere in the box to move the blob into the other one.
                            </p>
                        </div>
                    </div>
                </div>

                {/* blob area */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container w-full">
                            <div
                                ref={areaRef}
                                className="relative aspect-[16/9] w-full touch-none overflow-hidden rounded-xl border"
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={() => setDragging(false)}
                                onPointerCancel={() => setDragging(false)}
                            >
                                <Goo id={FILTER_ID} className="absolute inset-0">
                                    <div className="absolute top-1/2 left-1/3 aspect-square w-[18%] -translate-1/2 rounded-full bg-[#ff3131]" />
                                    <div
                                        className="absolute aspect-square w-[13%] -translate-1/2 rounded-full bg-black"
                                        style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
                                    />
                                </Goo>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
