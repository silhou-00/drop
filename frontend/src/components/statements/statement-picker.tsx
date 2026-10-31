// The statement picker on the map: a glass pill button that opens a list of "All statements",
// each statement the loaded drops came from (cut short, with its drop count), and "Earlier" for
// drops from before statements. The open list melts out of the pill through the shared goo
// filter. It is a listbox: arrows, Home and End move, Enter or Space chooses, Escape closes
// and returns focus to the button, Tab or a press outside closes. Choosing one hands it to the
// page, which puts it in the address. Statement text is shown as text only.
import { CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Goo, GooFilter } from "@/components/goo/goo-filter";
import type { Statement } from "@/lib/statements/model";

const OPTION_MAX = 40;
const GOO_ID = "statement-picker-goo";

type StatementPickerProps = {
    statements: Statement[];
    earlierCount: number;
    value: string | undefined;
    onChange: (statement: string | undefined) => void;
};

type PickerOption = { value: string | undefined; label: string; count: number | null };

// a long statement ends in an ellipsis, counted in code points
function shorten(text: string) {
    const points = Array.from(text);

    return points.length > OPTION_MAX ? `${points.slice(0, OPTION_MAX - 1).join("")}…` : text;
}

function buildOptions(statements: Statement[], earlierCount: number, value: string | undefined) {
    const options: PickerOption[] = [{ value: undefined, label: "All statements", count: null }];

    for (const statement of statements) {
        options.push({ value: statement.id, label: shorten(statement.text), count: statement.drop_count });
    }

    if (earlierCount > 0 || value === "earlier") {
        options.push({ value: "earlier", label: "Earlier", count: earlierCount });
    }

    return options;
}

// the drop count, with the word for screen readers
function OptionCount({ count }: { count: number | null }) {
    if (count === null) {
        return null;
    }

    return (
        <span className="statement-option-count">
            {count}
            <span className="inbox-sr">{count === 1 ? " drop" : " drops"}</span>
        </span>
    );
}

export function StatementPicker({ statements, earlierCount, value, onChange }: StatementPickerProps) {
    const baseId = useId();
    const labelId = `${baseId}-label`;
    const buttonId = `${baseId}-button`;
    const listId = `${baseId}-list`;
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const options = buildOptions(statements, earlierCount, value);
    const selectedIndex = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );
    const selected = options[selectedIndex];

    // focus the list on open; a press outside closes it
    useEffect(() => {
        if (!open) {
            return;
        }

        listRef.current?.focus();

        function handlePointerDown(event: PointerEvent) {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [open]);

    // keep the active option in view
    useEffect(() => {
        if (!open) {
            return;
        }

        document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
    }, [open, active, listId]);

    function openAt(index: number) {
        setActive(index);
        setOpen(true);
    }

    function closeToButton() {
        setOpen(false);
        buttonRef.current?.focus();
    }

    function choose(index: number) {
        onChange(options[index].value);
        closeToButton();
    }

    // closed: arrows open the list as well as Enter and Space
    function handleButtonKey(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAt(selectedIndex);
        }
    }

    // open: move, choose, or close
    function handleListKey(event: KeyboardEvent<HTMLUListElement>) {
        const last = options.length - 1;

        if (event.key === "Tab") {
            setOpen(false);

            return;
        }

        const moves: Record<string, () => void> = {
            ArrowDown: () => setActive(Math.min(active + 1, last)),
            ArrowUp: () => setActive(Math.max(active - 1, 0)),
            Home: () => setActive(0),
            End: () => setActive(last),
            Enter: () => choose(active),
            " ": () => choose(active),
            Escape: () => closeToButton(),
        };
        const move = moves[event.key];

        if (move) {
            event.preventDefault();
            move();
        }
    }

    return (
        <div ref={rootRef} className="placement statement-picker" data-open={open ? "true" : undefined}>
            <div className="container">
                <span id={labelId} className="inbox-sr">
                    Statement
                </span>
            </div>
            <div className="container statement-picker-wrap">
                <button
                    ref={buttonRef}
                    id={buttonId}
                    className="statement-picker-button"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-controls={open ? listId : undefined}
                    aria-labelledby={`${labelId} ${buttonId}`}
                    onClick={() => {
                        if (open) {
                            setOpen(false);
                        } else {
                            openAt(selectedIndex);
                        }
                    }}
                    onKeyDown={handleButtonKey}
                >
                    <span className="statement-picker-label">{selected.label}</span>
                    <OptionCount count={selected.count} />
                    <CaretDown className="statement-picker-caret" weight="bold" aria-hidden="true" />
                </button>

                {open ? (
                    <>
                        <GooFilter id={GOO_ID} crisp />
                        <Goo id={GOO_ID} className="statement-picker-goo">
                            <span className="statement-picker-blob" aria-hidden="true" />
                            <ul
                                ref={listRef}
                                id={listId}
                                className="statement-listbox"
                                role="listbox"
                                tabIndex={-1}
                                aria-labelledby={labelId}
                                aria-activedescendant={`${listId}-${active}`}
                                onKeyDown={handleListKey}
                            >
                                {options.map((option, index) => (
                                    <li
                                        key={option.value ?? "all"}
                                        id={`${listId}-${index}`}
                                        className="statement-option"
                                        role="option"
                                        aria-selected={index === selectedIndex}
                                        data-active={index === active ? "true" : undefined}
                                        onPointerMove={() => {
                                            setActive(index);
                                        }}
                                        onClick={() => {
                                            choose(index);
                                        }}
                                    >
                                        <span className="statement-option-check">
                                            {index === selectedIndex ? (
                                                <Check weight="bold" aria-hidden="true" />
                                            ) : null}
                                        </span>
                                        <span className="statement-option-label">{option.label}</span>
                                        <OptionCount count={option.count} />
                                    </li>
                                ))}
                            </ul>
                        </Goo>
                    </>
                ) : null}
            </div>
        </div>
    );
}
