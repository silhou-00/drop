// Marble renderer. Draws the Combed Veins bath into a canvas with one WebGL1 fragment
// shader, ported from the landing comp (bath.js). The bath is cover-fitted to one of two
// reference frames (portrait, landscape) so it matches the WebP stills. Pigment colours come
// from the marble tokens, the zone intensity and the colour mode. Progress spreads the red
// ink from the drop point (1 is settled, red across the whole bath).
// The landing adds its scene on top: a camera (a frame point held at a screen anchor, with a
// zoom), a clip window that limits shading to the plate, the combed street map, the ink drop's
// ripple, its red share and up to two calm boxes where lines thin and fade so copy above them
// stays readable. Left at their defaults, the bath looks as it does without.
// The renderer pauses while the canvas is off screen or the tab is hidden, caps the pixel
// ratio, and gives up when there is no WebGL, the shader fails, the context is lost or the
// first frames are slow; onFail then tells the caller to show the still instead. In external
// mode it runs no loop of its own: the caller draws by calling frame() from its own loop.
import { MARBLE_GL, MARBLE_PIGMENTS, type MarbleMode, type MarbleTokens, type MarbleZone } from "./tokens";

export type MarbleFailure = "no-webgl" | "shader" | "context-lost" | "slow";
export type MarbleSettings = { zone: MarbleZone; mode: MarbleMode; driftPeriod: number };
export type MarbleUniforms = Partial<MarbleSettings> & { tokens?: MarbleTokens };
export type MarbleOptions = MarbleSettings & { onFail: (reason: MarbleFailure) => void; external?: boolean };
export type MarblePoint = [number, number];
export type MarbleBox = [number, number, number, number];
export type MarbleCamera = { point: MarblePoint; anchor: MarblePoint; zoom: number };
export type MarbleClip = { x: number; y: number; w: number; h: number };
export type MarbleScene = {
    comb: number;
    impactTime: number;
    impactPoint: MarblePoint | null;
    ripple: [number, number];
    streets: [number, number, number];
    redStreet: [number, number];
    accent: number | null;
    calmBoxes: MarbleBox[];
    calmFeather: number;
};

export type MarbleHandle = {
    setUniforms: (uniforms: MarbleUniforms) => void;
    setProgress: (progress: number) => void;
    setCamera: (camera: MarbleCamera | null) => void;
    setScene: (scene: Partial<MarbleScene>) => void;
    setClip: (clip: MarbleClip | null) => void;
    frame: (now: number) => void;
    pause: () => void;
    resume: () => void;
    destroy: () => void;
};

type Rgb = [number, number, number];
type Pool = [number, number, number];
type ReferenceFrame = { w: number; h: number; aim: [number, number]; inkR: number; poolR: number; drops: [Pool, Pool] };

// one reference frame fitted to a canvas size, with its line metrics
export type MarbleFrame = ReferenceFrame & {
    key: "port" | "land";
    gap: number;
    lineWidth: number;
    amp: number;
    pitch: number;
    cover: number;
    crop: MarblePoint;
};

// reference frames from the landing comp, in frame pixels
const FRAMES: Record<"port" | "land", ReferenceFrame> = {
    port: {
        w: 390,
        h: 844,
        aim: [230, 450],
        inkR: 520,
        poolR: 62,
        drops: [
            [350, 112, 40],
            [26, 800, 46],
        ],
    },
    land: {
        w: 1440,
        h: 900,
        aim: [1150, 225],
        inkR: 760,
        poolR: 116,
        drops: [
            [250, 790, 92],
            [1340, 110, 70],
        ],
    },
};

export const COMB_ANGLE = -0.12;

const HERO_INTENSITY = 0.7;
const BUSY_SECONDS = 3.5;
const DRIFT_START = 2.4;
const DRIFT_FULL = 7;
const SLOW_SAMPLES = 40;
const POOL_GROW = 0.95 / 0.9;

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform vec3 uMap; uniform vec2 uRef; uniform vec4 uLine;
uniform float uTime, uPeriod, uDrift, uInk, uInkR, uPoolR, uAng, uAccent, uComb, uImpactT, uFeather;
uniform vec2 uImpact, uRip, uRedSt; uniform vec3 uDrop0, uDrop1, uSt; uniform vec4 uBox0, uBox1;
uniform vec3 uGround, uGrey, uPale, uIce, uRed, uRing, uStreet;
float h1(float n){ return fract(sin(n*127.1)*43758.5453); }
float hj(float n){ return fract(n*0.6180339887+0.137); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float n=i.x+i.y*57.; return mix(mix(h1(n),h1(n+1.),f.x),mix(h1(n+57.),h1(n+58.),f.x),f.y); }
float line(float d, float w, float aa){ return 1.-smoothstep(w*.5-aa*.5, w*.5+aa, d); }
float box(vec4 b, vec2 d){ if(b.z<=0.) return 0.; vec2 e=abs(d-b.xy-b.zw*.5)-b.zw*.5;
  return 1.-smoothstep(0., uFeather, length(max(e,0.))+min(max(e.x,e.y),0.)); }
vec2 push(vec2 q, vec3 dr, inout float pr, inout float pi){
  if(dr.z<=.5) return q;
  vec2 d=q-dr.xy; float r=length(d); float R=dr.z;
  if(r<=R){ pr=r; pi=R; return dr.xy; }
  return dr.xy + d*sqrt(1.-R*R/(r*r));
}
void main(){
  vec2 dp = vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);
  vec2 p = uMap.xy + dp*uMap.z;
  float aa = uMap.z;
  // calm boxes: lines thin and fade to the ground under copy, red drops out
  float cm = max(box(uBox0, dp), box(uBox1, dp));
  float gap=uLine.x, lw=uLine.y, amp=uLine.z, pitch=uLine.w;
  float open = 1.-uComb;
  // ripple from the ink drop: a travelling ring that pushes the veins outward
  if(uImpactT>=0.){ vec2 d=p-uImpact; float r=length(d)+1e-3; float fr=uImpactT*uPoolR*uRip.y;
    float w=exp(-pow((r-fr)/(uPoolR*.45),2.))*exp(-uImpactT*1.4);
    p -= d/r*w*gap*uRip.x*sin((r-fr)*0.09); }
  float ph = uTime*6.2832/uPeriod;
  vec2 q = p + vec2(sin(ph), cos(ph))*gap*1.6*uDrift*open;
  // pools: each later drop pushes the earlier pigment aside (inverse marbling map)
  float pr=0., pi=0., gr=0., gi=0.;
  float grow = 1.-pow(1.-clamp(uInk*${POOL_GROW.toFixed(6)},0.,1.),3.);
  q = push(q, vec3(uImpact, uPoolR*grow*open), pr, pi);
  q = push(q, vec3(uDrop1.xy, uDrop1.z*open), gr, gi);
  q = push(q, vec3(uDrop0.xy, uDrop0.z*open), gr, gi);
  float ca=cos(uAng), sa=sin(uAng);
  vec2 u = mat2(ca, sa, -sa, ca)*(q-uRef*.5);
  float a2 = amp*open*(.55+.9*vn(u*.004+3.));
  // combed rows wobble gently, so the streets are not ruled lines
  float y = u.y + a2*sin(u.x*6.2832/pitch + u.y*.012) + uSt.z*gap*sin(u.x/gap*.05+1.1)*uComb;
  float v = y/gap; float idx=floor(v+.5); float dist=abs(v-idx)*gap;
  float mainRow = 1.-step(.5, mod(idx,6.));
  float ave = 1.-step(.5, mod(idx,24.));
  float lwm = lw*(1.+mainRow*uComb*(.8+ave*.7));
  float la = line(dist, lwm*(1.-.45*cm), aa)*(1.-.7*cm);
  float hv = h1(idx*1.37+.5);
  vec3 lc = hv<.55 ? uGrey : (hv<.86 ? uPale : uIce);
  lc = mix(lc, uStreet, mainRow*uComb);
  la *= mix(1., mix(.16,1.,mainRow), uComb);
  // cross streets: uneven 0, 8, 14, 24, 31 in a 40-line block, jittered per block and bent
  float bx = u.x - uSt.y*gap*sin(u.y/gap*.035+.6);
  float P=gap*40.; float kb=floor(bx/P); float lx=bx-kb*P;
  float d0=min(abs(lx),abs(lx-P));
  d0=min(d0,abs(lx-gap*8.-(hj(kb*5.+1.)-.5)*uSt.x*gap));
  d0=min(d0,abs(lx-gap*14.-(hj(kb*5.+2.)-.5)*uSt.x*gap));
  d0=min(d0,abs(lx-gap*24.-(hj(kb*5.+3.)-.5)*uSt.x*gap));
  d0=min(d0,abs(lx-gap*31.-(hj(kb*5.+4.)-.5)*uSt.x*gap));
  float ka = line(d0, lw*1.8, aa)*uComb;
  // one diagonal avenue so the grid reads as a town, not graph paper
  float dg = abs(dot(u - vec2(-gap*22., 0.), vec2(.6,.8)));
  ka = max(ka, line(dg, lw*2.6, aa)*uComb);
  // ink: red veins grow out of the drop with a ragged wet front, everywhere once settled
  float r0 = length(p-uImpact);
  float n = vn(p*.011)*.65 + vn(p*.05)*.35;
  float fr = uInk*uInkR*(.62+.62*n);
  float inR = uInk>.999 ? 1. : 1.-smoothstep(fr-8., fr+2., r0);
  float wet = exp(-pow((r0-fr)/9.,2.))*step(.001,uInk)*(1.-step(.999,uInk));
  float isRed = step(h1(idx*3.7+1.), uAccent)*inR*(1.-cm)*(1.-uComb);
  float redSt = line(abs(y-uRedSt.x), lwm, aa)*uComb;
  float redX = line(abs(bx-uRedSt.y), lw*1.8, aa)*uComb;
  vec3 c1 = mix(lc, uRed, isRed);
  c1 = mix(c1, uRing*.85, wet*isRed);
  float inPool = step(.5, pi+gi);
  vec3 col = mix(uGround, c1, la*(1.-inPool));
  col = mix(col, uStreet, ka*(1.-inPool));
  col = mix(col, uRed, max(redSt, redX)*(1.-inPool));
  // pool rings: hairlines inside each clean pool
  if(pi>.5){ float rr=min(abs(pr-pi*.64),abs(pr-pi*.86)); col = mix(col, uRing, line(rr, lw*1.2, aa)*(1.-cm)); }
  if(gi>.5){ float rr=abs(gr-gi*.8); col = mix(col, uPale, line(rr, lw, aa)*(1.-cm)); }
  gl_FragColor = vec4(col,1.);
}`;

const UNIFORMS = [
    "uRes",
    "uMap",
    "uRef",
    "uLine",
    "uTime",
    "uPeriod",
    "uDrift",
    "uInk",
    "uInkR",
    "uPoolR",
    "uAng",
    "uAccent",
    "uComb",
    "uImpactT",
    "uFeather",
    "uBox0",
    "uBox1",
    "uImpact",
    "uRip",
    "uRedSt",
    "uSt",
    "uDrop0",
    "uDrop1",
    "uGround",
    "uGrey",
    "uPale",
    "uIce",
    "uRed",
    "uRing",
    "uStreet",
] as const;

type UniformName = (typeof UNIFORMS)[number];

const DEFAULT_SCENE: MarbleScene = {
    comb: 0,
    impactTime: -1,
    impactPoint: null,
    ripple: [0, 0],
    streets: [0, 0, 0],
    redStreet: [0, 0],
    accent: null,
    calmBoxes: [],
    calmFeather: 0,
};

// colour maths, same as the design sheet's marble generator
function hexToRgb(hex: string): Rgb {
    const value = hex.replace("#", "");

    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as Rgb;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function hueToChannel(p: number, q: number, t: number) {
    const h = (t + 1) % 1;

    if (h < 1 / 6) {
        return p + (q - p) * 6 * h;
    }

    if (h < 1 / 2) {
        return q;
    }

    if (h < 2 / 3) {
        return p + (q - p) * (2 / 3 - h) * 6;
    }

    return p;
}

// scales a colour's HSL saturation by s
function desaturate([r, g, b]: Rgb, s: number): Rgb {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let saturation = 0;

    if (max !== min) {
        const d = max - min;

        saturation = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        if (max === r) {
            h = (g - b) / d + (g < b ? 6 : 0);
        } else if (max === g) {
            h = (b - r) / d + 2;
        } else {
            h = (r - g) / d + 4;
        }

        h /= 6;
    }

    saturation *= s;

    const q = l < 0.5 ? l * (1 + saturation) : l + saturation - l * saturation;
    const p = 2 * l - q;

    return [hueToChannel(p, q, h + 1 / 3), hueToChannel(p, q, h), hueToChannel(p, q, h - 1 / 3)];
}

// pigment colours for one zone and mode
function pigments(tokens: MarbleTokens, zone: MarbleZone, mode: MarbleMode) {
    const base = MARBLE_PIGMENTS[mode];
    const intensity = intensityOf(tokens, zone);
    const ground = hexToRgb(base.ground);
    const grey = mixRgb(ground, mixRgb(ground, hexToRgb(base.grey), tokens.pigmentContrast), intensity);
    const toHero = Math.min(1, intensity / HERO_INTENSITY);

    return {
        ground,
        grey,
        pale: mixRgb(ground, grey, 0.5),
        ice: mixRgb(ground, hexToRgb(base.ice), Math.min(1, intensity * 1.2)),
        red: mixRgb(ground, desaturate(hexToRgb(base.red), tokens.saturation), intensity),
        ring: mixRgb(ground, hexToRgb(base.ring), toHero),
        street: mixRgb(ground, hexToRgb(base.street), toHero),
    };
}

function intensityOf(tokens: MarbleTokens, zone: MarbleZone) {
    if (zone === "hero") {
        return tokens.intensityHero;
    }

    if (zone === "content") {
        return tokens.intensityContent;
    }

    return tokens.intensityChrome;
}

// the reference frame for a canvas size: portrait or landscape by aspect, cover fitted
export function referenceFrame(width: number, height: number, tokens: MarbleTokens): MarbleFrame {
    const wide = width >= height;
    const frame = wide ? FRAMES.land : FRAMES.port;
    const scale = wide ? tokens.wideScale : 1;
    const cover = Math.max(width / frame.w, height / frame.h);

    return {
        ...frame,
        key: wide ? "land" : "port",
        gap: tokens.lineGap * scale,
        lineWidth: tokens.lineWidth * Math.sqrt(scale),
        amp: tokens.waveAmp * scale,
        pitch: tokens.wavePitch * scale,
        cover,
        crop: [(frame.w - width / cover) / 2, (frame.h - height / cover) / 2],
    };
}

const NO_BOX: MarbleBox = [0, 0, 0, 0];

function scaleBox(b: MarbleBox | undefined, ratio: number): MarbleBox {
    if (!b) {
        return NO_BOX;
    }

    return [b[0] * ratio, b[1] * ratio, b[2] * ratio, b[3] * ratio];
}

function smoothstep(a: number, b: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));

    return t * t * (3 - 2 * t);
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);

    if (!shader) {
        throw new Error("shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error("compile");
    }

    return shader;
}

// one full-screen triangle and the marble program
function buildProgram(gl: WebGLRenderingContext) {
    const program = gl.createProgram();

    if (!program) {
        throw new Error("program");
    }

    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("link");
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    const location = gl.getAttribLocation(program, "a");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

    return { program, buffer };
}

function getContext(canvas: HTMLCanvasElement) {
    try {
        return canvas.getContext("webgl", {
            antialias: false,
            alpha: false,
            depth: false,
            stencil: false,
            powerPreference: "low-power",
        });
    } catch {
        return null;
    }
}

export function createMarble(
    canvas: HTMLCanvasElement,
    tokens: MarbleTokens,
    options: MarbleOptions,
): MarbleHandle | null {
    const context = getContext(canvas);

    if (!context) {
        options.onFail("no-webgl");

        return null;
    }

    const gl: WebGLRenderingContext = context;

    let built: ReturnType<typeof buildProgram>;

    try {
        built = buildProgram(gl);
    } catch {
        options.onFail("shader");

        return null;
    }

    const locations = {} as Record<UniformName, WebGLUniformLocation | null>;
    const startedAt = performance.now();
    const frameLog: number[] = [];
    let current = tokens;
    let settings: MarbleSettings = { zone: options.zone, mode: options.mode, driftPeriod: options.driftPeriod };
    let scene: MarbleScene = { ...DEFAULT_SCENE };
    let camera: MarbleCamera | null = null;
    let clip: MarbleClip | null = null;
    let progress = 1;
    let quality = 1;
    let slowChecks = 0;
    let frameId = 0;
    let lastDraw = 0;
    let dirty = true;
    let cssWidth = 0;
    let cssHeight = 0;
    let userPaused = false;
    let hidden = document.hidden;
    let offscreen = false;
    let destroyed = false;

    for (const name of UNIFORMS) {
        locations[name] = gl.getUniformLocation(built.program, name);
    }

    // backing store at the capped pixel ratio, times the quality step; the CSS size is kept so
    // drawing never reads layout
    function sizeCanvas() {
        const ratio = Math.min(window.devicePixelRatio || 1, MARBLE_GL.dprCap) * quality;

        cssWidth = canvas.clientWidth;
        cssHeight = canvas.clientHeight;

        const width = Math.max(1, Math.round(cssWidth * ratio));
        const height = Math.max(1, Math.round(cssHeight * ratio));

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        gl.viewport(0, 0, width, height);
        dirty = true;
    }

    // camera and clip window: the frame point held at the anchor, shading kept to the plate
    function placeView(frame: MarbleFrame, ratio: number, cssHeight: number) {
        const g = gl;

        if (camera) {
            const k = frame.cover * camera.zoom;

            g.uniform3f(
                locations.uMap,
                camera.point[0] - camera.anchor[0] / k,
                camera.point[1] - camera.anchor[1] / k,
                1 / (k * ratio),
            );
        } else {
            g.uniform3f(locations.uMap, frame.crop[0], frame.crop[1], 1 / (frame.cover * ratio));
        }

        if (!clip) {
            g.disable(g.SCISSOR_TEST);

            return;
        }

        const x0 = Math.max(0, Math.floor(clip.x * ratio));
        const y0 = Math.max(0, Math.floor((cssHeight - clip.y - clip.h) * ratio));

        g.enable(g.SCISSOR_TEST);
        g.scissor(
            x0,
            y0,
            Math.max(0, Math.min(canvas.width - x0, Math.ceil(clip.w * ratio) + 2)),
            Math.max(0, Math.min(canvas.height - y0, Math.ceil(clip.h * ratio) + 2)),
        );
    }

    // calm boxes in device pixels; an empty slot has no width
    function placeBoxes(ratio: number) {
        const [b0, b1] = scene.calmBoxes;

        gl.uniform4f(locations.uBox0, ...scaleBox(b0, ratio));
        gl.uniform4f(locations.uBox1, ...scaleBox(b1, ratio));
        gl.uniform1f(locations.uFeather, Math.max(1, scene.calmFeather * ratio));
    }

    // every uniform for one frame
    function draw(seconds: number) {
        if (cssWidth === 0 || cssHeight === 0) {
            return;
        }

        const frame = referenceFrame(cssWidth, cssHeight, current);
        const colours = pigments(current, settings.zone, settings.mode);
        const zoneAccent = settings.zone === "hero" ? current.accentShareHero : current.accentShare;
        const impact = scene.impactPoint ?? frame.aim;
        const ratio = canvas.width / cssWidth;
        const u = locations;
        const g = gl;

        placeBoxes(ratio);
        placeView(frame, ratio, cssHeight);
        g.uniform2f(u.uRes, canvas.width, canvas.height);
        g.uniform2f(u.uRef, frame.w, frame.h);
        g.uniform4f(u.uLine, frame.gap, frame.lineWidth, frame.amp, frame.pitch);
        g.uniform1f(u.uTime, seconds);
        g.uniform1f(u.uPeriod, settings.driftPeriod / 1000);
        g.uniform1f(u.uDrift, smoothstep(DRIFT_START, DRIFT_FULL, seconds));
        g.uniform1f(u.uInk, progress);
        g.uniform1f(u.uInkR, frame.inkR);
        g.uniform1f(u.uPoolR, frame.poolR);
        g.uniform1f(u.uAng, COMB_ANGLE);
        g.uniform1f(u.uAccent, scene.accent ?? zoneAccent);
        g.uniform1f(u.uComb, scene.comb);
        g.uniform1f(u.uImpactT, scene.impactTime);
        g.uniform2f(u.uImpact, impact[0], impact[1]);
        g.uniform2f(u.uRip, ...scene.ripple);
        g.uniform2f(u.uRedSt, ...scene.redStreet);
        g.uniform3f(u.uSt, ...scene.streets);
        g.uniform3f(u.uDrop0, ...frame.drops[0]);
        g.uniform3f(u.uDrop1, ...frame.drops[1]);
        g.uniform3f(u.uGround, ...colours.ground);
        g.uniform3f(u.uGrey, ...colours.grey);
        g.uniform3f(u.uPale, ...colours.pale);
        g.uniform3f(u.uIce, ...colours.ice);
        g.uniform3f(u.uRed, ...colours.red);
        g.uniform3f(u.uRing, ...colours.ring);
        g.uniform3f(u.uStreet, ...colours.street);
        g.drawArrays(g.TRIANGLES, 0, 3);
    }

    // slow first frames: drop the resolution once, then give up
    function checkSpeed(now: number) {
        if (slowChecks >= 2) {
            return;
        }

        frameLog.push(now);

        if (frameLog.length < SLOW_SAMPLES) {
            return;
        }

        const intervals = frameLog
            .slice(1)
            .map((time, i) => time - frameLog[i])
            .sort((a, b) => a - b);
        const median = intervals[intervals.length >> 1];

        frameLog.length = 0;
        slowChecks++;

        if (median <= MARBLE_GL.slowMs) {
            slowChecks = 2;
        } else if (slowChecks === 1) {
            quality = MARBLE_GL.fallbackQuality;
            sizeCanvas();
        } else {
            fail("slow");
        }
    }

    // one frame: full rate while settling or after a change, idle rate after
    function frame(now: number) {
        if (destroyed) {
            return;
        }

        const seconds = (now - startedAt) / 1000;
        const busy = dirty || seconds < BUSY_SECONDS;

        if (busy || now - lastDraw > 1000 / MARBLE_GL.idleFps) {
            draw(seconds);
            lastDraw = now;
            dirty = false;
        }

        checkSpeed(now);
    }

    // own loop, used when the caller does not drive the frames
    function tick(now: number) {
        frameId = 0;

        if (!isRunning()) {
            return;
        }

        frame(now);

        if (!destroyed) {
            frameId = requestAnimationFrame(tick);
        }
    }

    function isRunning() {
        return !destroyed && !userPaused && !hidden && !offscreen;
    }

    // starts or stops the own loop to match the pause flags
    function sync() {
        if (options.external) {
            return;
        }

        if (isRunning() && frameId === 0) {
            frameLog.length = 0;
            dirty = true;
            frameId = requestAnimationFrame(tick);
        } else if (!isRunning() && frameId !== 0) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        }
    }

    function handleVisibility() {
        hidden = document.hidden;
        sync();
    }

    function handleContextLost(event: Event) {
        event.preventDefault();
        fail("context-lost");
    }

    const resizeObserver = new ResizeObserver(() => {
        sizeCanvas();
    });

    const intersectionObserver = new IntersectionObserver((entries) => {
        offscreen = !entries[entries.length - 1].isIntersecting;
        sync();
    });

    function destroy() {
        if (destroyed) {
            return;
        }

        destroyed = true;

        if (frameId !== 0) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        }

        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener("visibilitychange", handleVisibility);
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        // frees the program, not the context: a remount may reuse this canvas
        gl.deleteBuffer(built.buffer);
        gl.deleteProgram(built.program);
    }

    function fail(reason: MarbleFailure) {
        destroy();
        options.onFail(reason);
    }

    resizeObserver.observe(canvas);
    canvas.addEventListener("webglcontextlost", handleContextLost);

    if (!options.external) {
        intersectionObserver.observe(canvas);
        document.addEventListener("visibilitychange", handleVisibility);
    }

    sizeCanvas();
    sync();

    return {
        setUniforms: (uniforms) => {
            current = uniforms.tokens ?? current;
            settings = {
                zone: uniforms.zone ?? settings.zone,
                mode: uniforms.mode ?? settings.mode,
                driftPeriod: uniforms.driftPeriod ?? settings.driftPeriod,
            };
            dirty = true;
        },
        setProgress: (value) => {
            progress = Math.min(1, Math.max(0, value));
            dirty = true;
        },
        setCamera: (value) => {
            camera = value;
            dirty = true;
        },
        setScene: (value) => {
            scene = { ...scene, ...value };
            dirty = true;
        },
        setClip: (value) => {
            clip = value;
            dirty = true;
        },
        frame,
        pause: () => {
            userPaused = true;
            sync();
        },
        resume: () => {
            userPaused = false;
            sync();
        },
        destroy,
    };
}
