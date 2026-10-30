// Beat 07, "Your link is waiting". The band rises onto the flooded bath; once the bath has
// lifted away like a sheet of paper, the heading, the name field and the button are revealed
// on plain paper. Submitting the field does not sign anyone up: it opens the claim step with
// the typed name carried over, the same as the other "Claim your link" buttons.
import { useRef, type CSSProperties, type FormEvent } from "react";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

export function Claim() {
    const { reduced, openClaim } = useLanding();
    const sectionRef = useRef<HTMLElement>(null);
    const headRef = useRef<HTMLHeadingElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastRef = useRef<boolean | null>(null);

    useTimelineFrame(({ L, S, changed }) => {
        const section = sectionRef.current;

        if (!section || !changed) {
            return;
        }

        const rev = S.y > (reduced ? L.c.mid : L.c.rev);

        if (rev === lastRef.current) {
            return;
        }

        lastRef.current = rev;
        section.classList.toggle("rev", rev);
        headRef.current?.classList.toggle("in", rev);
    });

    // the field opens the claim step with the name it holds
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        openClaim(event.currentTarget, inputRef.current?.value ?? "");
    }

    return (
        <section className="section claim-band" id="claim-band" aria-labelledby="h2-c" ref={sectionRef}>
            {/* sticky band */}
            <div className="sub-section">
                {/* heading */}
                <div className="placement c-head">
                    <div className="container">
                        <span className="num">07 / 07</span>
                    </div>
                    <div className="container">
                        <h2 id="h2-c" className="mega" data-rise-late="" ref={headRef}>
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
                <div className="placement c-field">
                    <div className="container">
                        <p className="lede veil">Claim it in a minute. Share it anywhere.</p>
                    </div>
                    <div className="container">
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
                    <div className="container">
                        <p className="fine">Free, for everyone.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
