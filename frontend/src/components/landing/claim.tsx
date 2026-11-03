// Section 6, "Your link is waiting". The heading, the name field and the button arrive from
// depth as the section comes in, then the frame stays pinned. Submitting the field does not sign
// anyone up: it opens the claim step with the typed name carried over, the same as the other
// "Claim your link" buttons. Under reduced motion everything simply shows.
import { useRef, type CSSProperties, type FormEvent } from "react";
import { easeCubic, lerp } from "@/lib/landing/scenes";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

export function Claim() {
    const { reduced, tokens, openClaim } = useLanding();
    const headRef = useRef<HTMLHeadingElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const depthRefs = useRef<(HTMLDivElement | null)[]>([]);
    const lastRef = useRef(-1);

    // the depth zoom: each block grows to full size and fades in on the way to the pin
    useTimelineFrame(({ S, changed, relaid }) => {
        const e = easeCubic(S.arrive);

        if (reduced || !changed || (e === lastRef.current && !relaid)) {
            return;
        }

        lastRef.current = e;
        headRef.current?.classList.toggle("in", e > 0.4);
        depthRefs.current.forEach((el) => {
            if (el) {
                el.style.transform = e < 1 ? `scale(${lerp(tokens.claim.depth, 1, e).toFixed(4)})` : "";
                el.style.opacity = e < 1 ? e.toFixed(3) : "";
            }
        });
    });

    // the field opens the claim step with the name it holds
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        openClaim(event.currentTarget, inputRef.current?.value ?? "");
    }

    function depth(k: number) {
        return (el: HTMLDivElement | null) => {
            depthRefs.current[k] = el;
        };
    }

    return (
        <section className="section pinned claim-band" id="claim-band" data-pin="" aria-labelledby="h2-c">
            {/* pinned frame */}
            <div className="sub-section frame">
                {/* heading */}
                <div className="placement c-head" data-calm="">
                    <div className="container" ref={depth(0)}>
                        <h2 id="h2-c" className={reduced ? "mega in" : "mega"} ref={headRef}>
                            <span className="ln">
                                <span className="li" style={{ "--n": 0 } as CSSProperties}>
                                    Your link{" "}
                                </span>
                            </span>
                            <span className="ln i2">
                                <span className="li" style={{ "--n": 1 } as CSSProperties}>
                                    is waiting
                                </span>
                            </span>
                        </h2>
                    </div>
                </div>

                {/* name field */}
                <div className="placement c-field" data-calm="">
                    <div className="container" ref={depth(1)}>
                        <p className="lede">Claim it in a minute. Share it anywhere.</p>
                    </div>
                    <div className="container" ref={depth(2)}>
                        <form className="field" onSubmit={handleSubmit}>
                            <label htmlFor="band-name">drop.link/</label>
                            <input
                                id="band-name"
                                name="name"
                                autoComplete="off"
                                placeholder="yourname"
                                maxLength={30}
                                ref={inputRef}
                            />
                            <button className="btn btn-ink" type="submit">
                                Claim your link
                            </button>
                        </form>
                    </div>
                    <div className="container" ref={depth(3)}>
                        <p className="fine">Free, for everyone.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
