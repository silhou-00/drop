// The statement cards on My link: a row the owner swipes through, one card snapped to the
// middle with its neighbours peeking in at the edges. The card in the middle is the selected
// one and is reported up to the page; tapping a card, or the arrow keys, also selects it and
// slides it into the middle. The first card, "Write your own", holds the free-text field with
// its live count instead of a fixed line. It uses CSS scroll snap only, no library. Fixed lines
// are constants and typed text is shown as text only. Dots under the row show how many cards
// there are and which is picked, and tapping one jumps to it; the page checks it before any request.
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { STATEMENT_MAX, normalizeStatement } from "@/lib/statements/model";
import { CUSTOM_TEMPLATE_ID, STATEMENT_TEMPLATES } from "@/lib/statements/templates";

type TemplateCarouselProps = {
    selectedId: string;
    customText: string;
    onSelect: (id: string) => void;
    onCustomText: (text: string) => void;
};

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// the card whose middle is closest to the row's middle
function cardInView(scroller: HTMLElement) {
    const middle = scroller.scrollLeft + scroller.clientWidth / 2;
    const cards = Array.from(scroller.querySelectorAll<HTMLElement>("[data-template]"));
    let nearest = cards[0];

    for (const card of cards) {
        const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);

        if (distance < Math.abs(nearest.offsetLeft + nearest.offsetWidth / 2 - middle)) {
            nearest = card;
        }
    }

    return nearest?.dataset.template ?? "";
}

export function TemplateCarousel({ selectedId, customText, onSelect, onCustomText }: TemplateCarouselProps) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const reportedRef = useRef("");
    const frameRef = useRef(0);
    const smoothRef = useRef(false);
    const count = Array.from(normalizeStatement(customText)).length;
    const over = count > STATEMENT_MAX;

    // a selection that did not come from scrolling slides its card into the middle
    useEffect(() => {
        const scroller = scrollerRef.current;
        const card = scroller?.querySelector<HTMLElement>(`[data-template="${selectedId}"]`);

        if (!scroller || !card || reportedRef.current === selectedId) {
            return;
        }

        reportedRef.current = selectedId;
        scroller.scrollTo({
            left: card.offsetLeft - (scroller.clientWidth - card.offsetWidth) / 2,
            behavior: smoothRef.current && !prefersReducedMotion() ? "smooth" : "instant",
        });
        smoothRef.current = true;
    }, [selectedId]);

    // a pending scroll check does not outlive the row
    useEffect(() => {
        return () => {
            window.cancelAnimationFrame(frameRef.current);
        };
    }, []);

    // once a frame while scrolling, report the card in the middle
    function handleScroll() {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = window.requestAnimationFrame(() => {
            const scroller = scrollerRef.current;
            const id = scroller ? cardInView(scroller) : "";

            if (id && id !== reportedRef.current) {
                reportedRef.current = id;
                onSelect(id);
            }
        });
    }

    // left and right move one card; inside the text box they move the caret instead
    function handleKey(event: KeyboardEvent<HTMLDivElement>) {
        if (event.target instanceof HTMLInputElement) {
            return;
        }

        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        const index = STATEMENT_TEMPLATES.findIndex((template) => template.id === selectedId);
        const next = STATEMENT_TEMPLATES[index + step];

        if (step === 0 || !next) {
            return;
        }

        event.preventDefault();
        onSelect(next.id);
        scrollerRef.current
            ?.querySelector<HTMLElement>(`[data-template="${next.id}"] button, [data-template="${next.id}"] input`)
            ?.focus({ preventScroll: true });
    }

    return (
        // statement cards
        <div className="sub-section mylink-cards">
            {/* caption */}
            <div className="placement">
                <div className="container">
                    <p id="template-label" className="mylink-caption">
                        Pick a statement
                    </p>
                </div>
            </div>

            {/* swipe row */}
            <div
                ref={scrollerRef}
                className="placement mylink-carousel"
                role="group"
                aria-labelledby="template-label"
                onScroll={handleScroll}
                onKeyDown={handleKey}
            >
                {STATEMENT_TEMPLATES.map((template) => {
                    const selected = template.id === selectedId;
                    const accent = { "--tpl-accent": template.accent } as CSSProperties;

                    if (template.id === CUSTOM_TEMPLATE_ID) {
                        return (
                            <div key={template.id} className="container mylink-slide" data-template={template.id}>
                                <div
                                    className="mylink-tpl mylink-tpl-custom"
                                    data-selected={selected ? "true" : undefined}
                                    style={accent}
                                >
                                    <label className="mylink-tpl-label" htmlFor="statement-text">
                                        {template.text}
                                    </label>
                                    <input
                                        id="statement-text"
                                        className="auth-input"
                                        name="statement"
                                        type="text"
                                        autoComplete="off"
                                        enterKeyHint="done"
                                        placeholder="Ask your followers something"
                                        value={customText}
                                        aria-invalid={over ? true : undefined}
                                        aria-describedby="statement-count statement-error"
                                        onFocus={() => {
                                            onSelect(template.id);
                                        }}
                                        onChange={(event) => {
                                            onCustomText(event.target.value);
                                        }}
                                    />
                                    <p
                                        id="statement-count"
                                        className="mylink-count"
                                        data-over={over ? "true" : undefined}
                                    >
                                        {count}/{STATEMENT_MAX}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={template.id} className="container mylink-slide" data-template={template.id}>
                            <button
                                className="mylink-tpl"
                                type="button"
                                aria-pressed={selected}
                                data-selected={selected ? "true" : undefined}
                                style={accent}
                                onClick={() => {
                                    onSelect(template.id);
                                }}
                            >
                                <span className="mylink-tpl-mark" aria-hidden="true" />
                                <span className="mylink-tpl-text">{template.text}</span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* dots: how many cards there are, which one is picked, and a tap to jump to one */}
            <div className="placement mylink-dots">
                {STATEMENT_TEMPLATES.map((template, index) => (
                    <div key={template.id} className="container">
                        <button
                            className="mylink-dot"
                            type="button"
                            aria-label={`Card ${index + 1} of ${STATEMENT_TEMPLATES.length}: ${template.text}`}
                            aria-current={template.id === selectedId ? "true" : undefined}
                            onClick={() => {
                                onSelect(template.id);
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
