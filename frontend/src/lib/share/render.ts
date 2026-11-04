// Draws the story card on a canvas and hands it back as a PNG. Nothing here touches the network
// except the same-origin logo and the brand fonts, which load before the first stroke. The
// message is drawn as canvas text only, wrapped and shrunk until it fits its paper card, and
// emoji fall back to the system fonts. The photo is a same-origin image, so the canvas stays
// readable. The card never prints the address; the owner adds their own Link sticker anywhere
// on it. The layout follows the story comp; positions and sizes live in model.ts. The chosen
// style sets the ground and its veins, the card and text colours, the font, the largest
// message size and the alignment; dark grounds take the light logo. The default style draws
// the comp unchanged.
import {
    CARD_HEIGHT,
    CARD_WIDTH,
    PIN_GRID,
    PIN_PATH,
    PLACE_SOURCE_LABEL,
    STORY_COLORS,
    STORY_BACKGROUNDS,
    STORY_CARD_COLORS,
    STORY_FILE_TYPE,
    STORY_FONT_FACES,
    STORY_FONTS,
    STORY_LAYOUT,
    STORY_TEXT_SIZES,
    STORY_TYPEFACES,
    type StoryAlign,
    type StoryBackgroundSpec,
    type StoryInput,
    type StoryOptions,
    type StoryStyle,
} from "./model";

const ELLIPSIS = "…";
const PILL_LINE_HEIGHT = 1.2;
const SIZE_STEP = 2;
const VEIN_STEP = 8;
const CANVAS_FAILED = "The canvas could not be drawn.";

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const logoLoads = new Map<string, Promise<HTMLImageElement | null>>();

type Ctx = CanvasRenderingContext2D;

type Fit = { size: number; lines: string[] };

// how the message card looks, resolved from the chosen style
type Look = {
    fill: string;
    edge: string | null;
    ink: string;
    family: string;
    weight: number;
    maxSize: number;
    align: StoryAlign;
};

function font(weight: number, size: number, family: string) {
    return `${weight} ${size}px ${family}, ${STORY_FONTS.fallback}`;
}

// each logo once per page; a failed load leaves the card without it
function loadLogo(path: string) {
    let load = logoLoads.get(path);

    if (!load) {
        const image = new Image();

        image.src = path;
        load = image.decode().then(
            () => image,
            () => null,
        );
        logoLoads.set(path, load);
    }

    return load;
}

// the entry for an id; the style is checked before it gets here, so the first is only a guard
function pick<T extends { id: string }>(list: readonly T[], id: string) {
    return list.find((entry) => entry.id === id) ?? list[0];
}

function resolveLook(style: StoryStyle): Look {
    const card = pick(STORY_CARD_COLORS, style.card);
    const background = pick(STORY_BACKGROUNDS, style.background);
    const typeface = pick(STORY_TYPEFACES, style.font);

    return {
        fill: card.fill,
        edge: background.cardEdge,
        ink: card.ink,
        family: typeface.family,
        weight: typeface.weight,
        maxSize: pick(STORY_TEXT_SIZES, style.size).maxSize,
        align: style.align,
    };
}

function loadFonts() {
    return Promise.all(STORY_FONT_FACES.map((face) => document.fonts.load(face)));
}

function splitGraphemes(text: string) {
    return Array.from(graphemes.segment(text), (part) => part.segment);
}

// lines that fit the width; a word wider than the line breaks between characters
function wrapText(ctx: Ctx, text: string, width: number) {
    const lines: string[] = [];

    for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
        let line = "";

        for (const word of paragraph.split(" ")) {
            const next = line ? `${line} ${word}` : word;

            if (ctx.measureText(next).width <= width) {
                line = next;
                continue;
            }

            if (line) {
                lines.push(line);
                line = "";
            }

            for (const piece of splitGraphemes(word)) {
                const grown = line + piece;

                if (line && ctx.measureText(grown).width > width) {
                    lines.push(line);
                    line = piece;
                } else {
                    line = grown;
                }
            }
        }

        lines.push(line);
    }

    return lines;
}

// cut a line until it and the ellipsis fit the width
function ellipsize(ctx: Ctx, text: string, width: number) {
    const parts = splitGraphemes(text);

    while (parts.length > 0 && ctx.measureText(parts.join("") + ELLIPSIS).width > width) {
        parts.pop();
    }

    return parts.join("").trimEnd() + ELLIPSIS;
}

// the largest message size whose lines fit the box; past the floor the last line is cut
function fitMessage(ctx: Ctx, message: string, width: number, height: number, look: Look): Fit {
    const { messageMinSize, messageLineHeight } = STORY_LAYOUT;

    for (let size = look.maxSize; size >= messageMinSize; size -= SIZE_STEP) {
        ctx.font = font(look.weight, size, look.family);

        const lines = wrapText(ctx, message, width);

        if (lines.length * size * messageLineHeight <= height) {
            return { size, lines };
        }
    }

    ctx.font = font(look.weight, messageMinSize, look.family);

    const lines = wrapText(ctx, message, width);
    const keep = Math.max(1, Math.floor(height / (messageMinSize * messageLineHeight)));
    const kept = lines.slice(0, keep);

    kept[keep - 1] = ellipsize(ctx, kept[keep - 1] ?? "", width);

    return { size: messageMinSize, lines: kept };
}

function roundRect(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
}

// combed veins on the ground, grey and pale with a red line now and then
function drawBath(ctx: Ctx, background: StoryBackgroundSpec) {
    const { veinGap, veinWidth, veinAmplitude, veinPitch } = STORY_LAYOUT;
    const turn = Math.PI * 2;

    ctx.fillStyle = background.ground;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    ctx.lineWidth = veinWidth;
    ctx.lineCap = "round";

    for (let index = 0, y = -veinAmplitude * 2; y < CARD_HEIGHT + veinAmplitude * 2; index += 1, y += veinGap) {
        const red = Math.sin(index * 0.37) + Math.sin(index * 0.11) > 1.3;

        ctx.strokeStyle = red ? background.veinRed : index % 2 === 0 ? background.veinGrey : background.veinPale;
        ctx.beginPath();

        for (let x = 0; x <= CARD_WIDTH + VEIN_STEP; x += VEIN_STEP) {
            const wave =
                veinAmplitude * Math.sin((turn * x) / veinPitch + index * 0.21) +
                veinAmplitude * 0.5 * Math.sin((turn * x) / (veinPitch * 2.7) + index * 0.07);

            if (x === 0) {
                ctx.moveTo(x, y + wave);
            } else {
                ctx.lineTo(x, y + wave);
            }
        }

        ctx.stroke();
    }
}

function drawLogo(ctx: Ctx, logo: HTMLImageElement | null) {
    if (!logo) {
        return;
    }

    const { logoTop, logoWidth, logoRatio } = STORY_LAYOUT;

    ctx.drawImage(logo, (CARD_WIDTH - logoWidth) / 2, logoTop, logoWidth, logoWidth * logoRatio);
}

// the message paper; returns where it ends
function drawPaper(ctx: Ctx, fit: Fit, top: number, look: Look) {
    const { paperInset, paperPaddingBlock, paperPaddingInline, paperRadius, paperShadowBlur, paperShadowY } =
        STORY_LAYOUT;
    const lineHeight = fit.size * STORY_LAYOUT.messageLineHeight;
    const width = CARD_WIDTH - paperInset * 2;
    const height = fit.lines.length * lineHeight + paperPaddingBlock * 2;

    ctx.save();
    ctx.shadowColor = STORY_COLORS.shadow;
    ctx.shadowBlur = paperShadowBlur;
    ctx.shadowOffsetY = paperShadowY;
    ctx.fillStyle = look.fill;
    roundRect(ctx, paperInset, top, width, height, paperRadius);
    ctx.fill();
    ctx.restore();

    // a hairline so a dark card still reads on a dark ground
    if (look.edge) {
        ctx.strokeStyle = look.edge;
        ctx.lineWidth = STORY_LAYOUT.paperEdgeWidth;
        roundRect(ctx, paperInset, top, width, height, paperRadius);
        ctx.stroke();
    }

    const x = look.align === "center" ? CARD_WIDTH / 2 : paperInset + paperPaddingInline;

    ctx.font = font(look.weight, fit.size, look.family);
    ctx.fillStyle = look.ink;
    ctx.textAlign = look.align;
    ctx.textBaseline = "middle";
    fit.lines.forEach((line, index) => {
        ctx.fillText(line, x, top + paperPaddingBlock + (index + 0.5) * lineHeight);
    });

    return top + height;
}

// the photo, cover-fit in a circle inside its ice and red rings
function drawPhoto(
    ctx: Ctx,
    photo: HTMLImageElement | ImageBitmap,
    centerY: number,
    size: number,
    background: StoryBackgroundSpec,
) {
    const centerX = CARD_WIDTH / 2;
    const radius = size / 2;
    const [grey, outerIce, red, innerIce] = STORY_LAYOUT.photoRings;
    const rings: [number, string][] = [
        [grey, background.ringOuter],
        [outerIce, STORY_COLORS.ice],
        [red, background.ringAccent],
        [innerIce, STORY_COLORS.ice],
    ];

    for (const [ring, color] of rings) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + ring, 0, Math.PI * 2);
        ctx.fill();
    }

    const imageWidth = photo instanceof HTMLImageElement ? photo.naturalWidth : photo.width;
    const imageHeight = photo instanceof HTMLImageElement ? photo.naturalHeight : photo.height;
    const scale = Math.max(size / imageWidth, size / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photo, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
}

// the message, and the photo under it when there is one, between the logo and the place pill
function drawBody(
    ctx: Ctx,
    message: string,
    photo: HTMLImageElement | ImageBitmap | null,
    look: Look,
    background: StoryBackgroundSpec,
) {
    const { paperInset, paperPaddingBlock, paperPaddingInline, paperTop, photoGap, photoMaxSize, photoMinSize } =
        STORY_LAYOUT;
    const ringSpan = STORY_LAYOUT.photoRings[0] * 2;
    const bottom = STORY_LAYOUT.placeTop - photoGap;
    const textWidth = CARD_WIDTH - paperInset * 2 - paperPaddingInline * 2;

    if (!photo) {
        const fit = fitMessage(ctx, message, textWidth, bottom - paperTop - paperPaddingBlock * 2, look);
        const height = fit.lines.length * fit.size * STORY_LAYOUT.messageLineHeight + paperPaddingBlock * 2;

        drawPaper(ctx, fit, paperTop + (bottom - paperTop - height) / 2, look);
        return;
    }

    const textHeight = bottom - paperTop - photoGap - photoMinSize - ringSpan - paperPaddingBlock * 2;
    const fit = fitMessage(ctx, message, textWidth, textHeight, look);
    const paperBottom = drawPaper(ctx, fit, paperTop, look);
    const room = bottom - paperBottom - photoGap;
    const size = Math.min(photoMaxSize, room - ringSpan);

    drawPhoto(ctx, photo, paperBottom + photoGap + room / 2, size, background);
}

// the place on a white pill: pin, name and where it came from; a shadow lifts it off pale grounds
function drawPlace(ctx: Ctx, name: string, background: StoryBackgroundSpec) {
    const { placeTop, placePaddingBlock, placePaddingInline, placeGap, placeMaxSize, placeMinSize, placeSourceSize } =
        STORY_LAYOUT;

    ctx.font = font(500, placeSourceSize, STORY_FONTS.body);

    const sourceWidth = ctx.measureText(PLACE_SOURCE_LABEL).width;
    const fixed = placePaddingInline * 2 + placeGap * 2 + sourceWidth;
    const room = (size: number) => STORY_LAYOUT.pillMaxWidth - fixed - size;
    const fit = { size: placeMaxSize, text: name };

    // the pin is one em wide, so the name's room depends on its own size
    ctx.font = font(700, fit.size, STORY_FONTS.display);

    while (fit.size > placeMinSize && ctx.measureText(name).width > room(fit.size)) {
        fit.size -= SIZE_STEP;
        ctx.font = font(700, fit.size, STORY_FONTS.display);
    }

    if (ctx.measureText(name).width > room(fit.size)) {
        fit.text = ellipsize(ctx, name, room(fit.size));
    }

    const nameWidth = ctx.measureText(fit.text).width;
    const width = fixed + fit.size + nameWidth;
    const height = fit.size * PILL_LINE_HEIGHT + placePaddingBlock * 2;
    const left = (CARD_WIDTH - width) / 2;
    const middle = placeTop + height / 2;

    ctx.save();

    if (background.pillShadow) {
        ctx.shadowColor = background.pillShadow;
        ctx.shadowBlur = STORY_LAYOUT.pillShadowBlur;
        ctx.shadowOffsetY = STORY_LAYOUT.pillShadowY;
    }

    ctx.fillStyle = STORY_COLORS.paper;
    roundRect(ctx, left, placeTop, width, height, height / 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(left + placePaddingInline, middle - fit.size / 2);
    ctx.scale(fit.size / PIN_GRID, fit.size / PIN_GRID);
    ctx.fillStyle = STORY_COLORS.accent;
    ctx.fill(new Path2D(PIN_PATH));
    ctx.restore();

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = STORY_COLORS.ink;
    ctx.fillText(fit.text, left + placePaddingInline + fit.size + placeGap, middle);
    ctx.font = font(500, placeSourceSize, STORY_FONTS.body);
    ctx.fillStyle = STORY_COLORS.ink2;
    ctx.fillText(PLACE_SOURCE_LABEL, left + width - placePaddingInline - sourceWidth, middle);
}

function toBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error(CANVAS_FAILED));
            }
        }, STORY_FILE_TYPE);
    });
}

export async function renderStoryCard(input: StoryInput, options: StoryOptions): Promise<Blob> {
    const background = pick(STORY_BACKGROUNDS, options.style.background);
    const look = resolveLook(options.style);
    const [logo] = await Promise.all([loadLogo(background.logo), loadFonts()]);
    const canvas = document.createElement("canvas");

    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error(CANVAS_FAILED);
    }

    drawBath(ctx, background);
    drawLogo(ctx, logo);
    drawBody(ctx, input.message, options.includePhoto ? input.photo : null, look, background);

    if (options.includePlace && input.placeName) {
        drawPlace(ctx, input.placeName, background);
    }

    return toBlob(canvas);
}
