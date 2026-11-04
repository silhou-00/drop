// Tests for the in-memory drop events: delivery to one owner only, the open stream cap,
// freeing a slot on stop, a safe second stop, and silence after stop.
import { describe, expect, it } from "vitest";
import { createDropEvents } from "./events.js";

describe("drop events", () => {
    it("reaches only the listeners of that owner", () => {
        const events = createDropEvents();
        const mine: string[] = [];
        const theirs: string[] = [];

        events.subscribe("a", (id) => mine.push(id));
        events.subscribe("b", (id) => theirs.push(id));
        events.publish("a", "d1");

        expect(mine).toEqual(["d1"]);
        expect(theirs).toEqual([]);
    });

    it("refuses the sixth subscription for one owner", () => {
        const events = createDropEvents();

        for (let i = 0; i < 5; i += 1) {
            expect(events.subscribe("a", () => {})).toBeTypeOf("function");
        }

        expect(events.subscribe("a", () => {})).toBeNull();
        expect(events.subscribe("b", () => {})).toBeTypeOf("function");
    });

    it("frees a slot when a listener stops", () => {
        const events = createDropEvents({ maxPerOwner: 1 });
        const stop = events.subscribe("a", () => {});

        expect(events.subscribe("a", () => {})).toBeNull();

        stop?.();

        expect(events.subscribe("a", () => {})).toBeTypeOf("function");
    });

    it("is safe to stop twice and never frees another listener's slot", () => {
        const events = createDropEvents({ maxPerOwner: 2 });
        const stop = events.subscribe("a", () => {});

        events.subscribe("a", () => {});
        stop?.();
        stop?.();

        expect(events.subscribe("a", () => {})).toBeTypeOf("function");
        expect(events.subscribe("a", () => {})).toBeNull();
    });

    it("calls nothing after stop", () => {
        const events = createDropEvents();
        const seen: string[] = [];
        const stop = events.subscribe("a", (id) => seen.push(id));

        stop?.();
        events.publish("a", "d1");

        expect(seen).toEqual([]);
    });
});
