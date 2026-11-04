// The Style area under a story preview, on My link and on a drop's Share panel. Five labelled
// groups of real radio buttons, so arrow keys move between choices: background and card colour
// as swatches, font, text size and alignment as chips. Every choice comes from the fixed lists
// in the share model and goes into the shared in-memory style, which redraws the preview.
// Nothing is stored or uploaded, and the swatch colours are constants, never user input.
import { TextAlignCenter, TextAlignLeft } from "@phosphor-icons/react";
import { useId, type CSSProperties, type ReactNode } from "react";
import { useStoryStyle } from "@/hooks/share/use-story-style";
import {
    STORY_ALIGNS,
    STORY_BACKGROUNDS,
    STORY_CARD_COLORS,
    STORY_TEXT_SIZES,
    STORY_TYPEFACES,
    type StoryAlign,
    type StoryStyle,
} from "@/lib/share/model";
import "@/styles/share.css";

const ALIGN_ICONS: Record<StoryAlign, ReactNode> = {
    left: <TextAlignLeft weight="bold" aria-hidden="true" />,
    center: <TextAlignCenter weight="bold" aria-hidden="true" />,
};

type Choice = { id: string; label: string; swatch?: string; vein?: string; icon?: ReactNode };

type StyleGroupProps = {
    name: string;
    legend: string;
    kind: "swatch" | "chip";
    field: keyof StoryStyle;
    choices: readonly Choice[];
};

// one labelled radio group; the input is hidden but keeps focus and arrow keys
function StyleGroup({ name, legend, kind, field, choices }: StyleGroupProps) {
    const { style, setStyle } = useStoryStyle();

    return (
        <fieldset className="story-group">
            <legend className="story-legend">{legend}</legend>
            <div className="story-options">
                {choices.map((choice) => (
                    <label key={choice.id} className={`story-${kind}`} data-field={field} data-value={choice.id}>
                        <input
                            className="story-radio"
                            type="radio"
                            name={name}
                            value={choice.id}
                            checked={style[field] === choice.id}
                            onChange={() => {
                                setStyle({ [field]: choice.id });
                            }}
                        />
                        {kind === "swatch" ? (
                            <span
                                className="story-swatch-dot"
                                aria-hidden="true"
                                style={
                                    { "--story-swatch": choice.swatch, "--story-vein": choice.vein } as CSSProperties
                                }
                            />
                        ) : null}
                        {choice.icon}
                        <span className="story-choice-label">{choice.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

export function StoryStyleControls() {
    const id = useId();
    const backgrounds = STORY_BACKGROUNDS.map((entry) => ({ ...entry, vein: entry.swatchVein }));
    const cards = STORY_CARD_COLORS.map((entry) => ({ ...entry, vein: entry.fill }));
    const aligns = STORY_ALIGNS.map((entry) => ({ ...entry, icon: ALIGN_ICONS[entry.id] }));

    return (
        // style controls
        <div className="placement story-style">
            <div className="container">
                <h3 className="story-style-title">Style</h3>
            </div>
            <div className="container">
                <StyleGroup
                    name={`${id}-background`}
                    legend="Background"
                    kind="swatch"
                    field="background"
                    choices={backgrounds}
                />
            </div>
            <div className="container">
                <StyleGroup name={`${id}-card`} legend="Card colour" kind="swatch" field="card" choices={cards} />
            </div>
            <div className="container">
                <StyleGroup name={`${id}-font`} legend="Font" kind="chip" field="font" choices={STORY_TYPEFACES} />
            </div>
            <div className="container">
                <StyleGroup
                    name={`${id}-size`}
                    legend="Text size"
                    kind="chip"
                    field="size"
                    choices={STORY_TEXT_SIZES}
                />
            </div>
            <div className="container">
                <StyleGroup name={`${id}-align`} legend="Alignment" kind="chip" field="align" choices={aligns} />
            </div>
        </div>
    );
}
