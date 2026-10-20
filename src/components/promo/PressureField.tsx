import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { fieldPixelRatio, shouldAnimateField } from "./fieldMotion";

/**
 * Pressure field: a WebGL2 isobar chart.
 *
 * Every repository is a pressure centre whose height is its attention score, so
 * isobars tighten around the urgent ones. Colours come from CSS tokens
 * (`--field-*`) so the seven themes stay the single source of truth.
 *
 * The field is decoration: any failure (no WebGL2, shader error, context lost)
 * hides the canvas and leaves the hero intact.
 */

export interface FieldSource {
  /** 0..1 from the left */
  x: number;
  /** 0..1 from the top */
  y: number;
  /** 0..~1.25 */
  amp: number;
}

/**
 * Capacity of the shader, not of the fleet: `uSrc[N]` is a fixed-size uniform
 * array and `N` must be a compile-time constant. The promo fleet sends seven
 * sources, so one slot stays empty on purpose — extra sources at runtime are
 * ignored rather than silently reallocating the shader.
 */
const MAX_SOURCES = 8;

const VERTEX_SHADER = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
#define N ${MAX_SOURCES}
uniform vec2 uRes; uniform float uTime; uniform float uDpr;
uniform vec3 uSrc[N];
uniform vec3 uMouse;
uniform vec3 uInk; uniform vec3 uWarn; uniform vec3 uHot;
uniform float uAlpha;
out vec4 o;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= .5; } return v; }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1. - uv.y;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * .035;

  // slow domain warp: isobars drift like weather systems
  vec2 w = vec2(fbm(p * 1.4 + vec2(t, 0.)), fbm(p * 1.4 + vec2(0., -t) + 3.1)) - .5;
  vec2 q = p + w * .09;

  float f = 0.;
  for (int i = 0; i < N; i++){
    vec2 d = q - vec2(uSrc[i].x * aspect, uSrc[i].y);
    f += uSrc[i].z * exp(-dot(d, d) / .028);
  }
  f += .2 * (fbm(q * 1.15 + t * .6) - .5);
  vec2 dm = q - vec2(uMouse.x * aspect, uMouse.y);
  f += uMouse.z * .28 * exp(-dot(dm, dm) / .014);

  // isobars, every fifth one is an index line
  float v = f * 15.;
  float fw = max(fwidth(v), 1e-4);
  float dist = abs(fract(v + .5) - .5) / fw;
  float idx = floor(v + .5);
  float major = 1. - step(.5, abs(mod(idx, 5.)));
  float wpx = mix(.7, 1.45, major) * uDpr;
  float line = 1. - smoothstep(wpx - .5, wpx + .7, dist);

  vec3 c = mix(uInk, uWarn, smoothstep(.24, .3, f));
  c = mix(c, uHot, smoothstep(.62, .7, f));
  float lineA = line * uAlpha * mix(.5, 1., major) * (.45 + .55 * smoothstep(.0, .55, f));

  // hatching inside the critical zone
  float hp = (gl_FragCoord.x - gl_FragCoord.y) / (6. * uDpr);
  float hl = 1. - smoothstep(.08, .2, abs(fract(hp) - .5));
  float inside = smoothstep(.66, .7, f);
  float hatchA = hl * inside * uAlpha * .3;

  float a = max(lineA, hatchA);
  vec3 col = lineA >= hatchA ? c : uHot;
  o = vec4(col * a, a);
}`;

interface Palette {
  ink: [number, number, number];
  warn: [number, number, number];
  hot: [number, number, number];
  alpha: number;
}

const FALLBACK_PALETTE: Palette = {
  ink: [0.55, 0.58, 0.63],
  warn: [0.96, 0.7, 0.15],
  hot: [1, 0.28, 0.27],
  alpha: 0.42,
};

function resolveColor(ctx: CanvasRenderingContext2D, value: string, fallback: [number, number, number]) {
  const css = value.trim();
  if (!css) return fallback;
  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return [data[0] / 255, data[1] / 255, data[2] / 255] as [number, number, number];
  } catch {
    return fallback;
  }
}

function readPalette(ctx: CanvasRenderingContext2D | null): Palette {
  if (!ctx) return FALLBACK_PALETTE;
  try {
    const styles = getComputedStyle(document.documentElement);
    const alpha = Number.parseFloat(styles.getPropertyValue("--field-alpha"));
    return {
      ink: resolveColor(ctx, styles.getPropertyValue("--field-ink"), FALLBACK_PALETTE.ink),
      warn: resolveColor(ctx, styles.getPropertyValue("--field-warn"), FALLBACK_PALETTE.warn),
      hot: resolveColor(ctx, styles.getPropertyValue("--field-hot"), FALLBACK_PALETTE.hot),
      alpha: Number.isFinite(alpha) && alpha > 0 ? alpha : FALLBACK_PALETTE.alpha,
    };
  } catch {
    return FALLBACK_PALETTE;
  }
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "shader compile failed";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

interface PressureFieldProps {
  sources: FieldSource[];
  className?: string;
  /** Element whose pointer movement nudges the field. */
  pointerTarget?: React.RefObject<HTMLElement | null>;
}

export function PressureField({ sources, className, pointerTarget }: PressureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targets = useRef<FieldSource[]>(sources);
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    targets.current = sources;
    redrawRef.current?.();
  }, [sources]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
    } catch {
      gl = null;
    }
    if (!gl) {
      canvas.dataset.fallback = "true";
      return;
    }

    let program: WebGLProgram | null = null;
    try {
      program = gl.createProgram();
      if (!program) throw new Error("program");
      gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
      gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
      }
    } catch {
      canvas.dataset.fallback = "true";
      return;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    if (!buffer) {
      canvas.dataset.fallback = "true";
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // A single oversized triangle covers the viewport.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl!.getUniformLocation(program!, name);
    const uRes = uniform("uRes");
    const uTime = uniform("uTime");
    const uDpr = uniform("uDpr");
    const uSrc = uniform("uSrc");
    const uMouse = uniform("uMouse");
    const uInk = uniform("uInk");
    const uWarn = uniform("uWarn");
    const uHot = uniform("uHot");
    const uAlpha = uniform("uAlpha");

    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    let probeContext: CanvasRenderingContext2D | null = null;
    try {
      probeContext = probe.getContext("2d", { willReadFrequently: true });
    } catch {
      probeContext = null;
    }
    let palette = readPalette(probeContext);

    const motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reducedMotion = !!motionQuery?.matches;
    let visible = true;
    let running = false;
    let disposed = false;
    let first = true;
    let dpr = 1;

    const current = new Float32Array(MAX_SOURCES * 3);
    const packed = new Float32Array(MAX_SOURCES * 3);
    const pointer = { x: 0.5, y: 0.5, amp: 0, target: 0 };

    const animated = () => shouldAnimateField({ reducedMotion, visible, documentHidden: document.hidden });

    const draw = (time: number, snap: boolean) => {
      if (!gl) return;
      const target = targets.current;
      for (let i = 0; i < MAX_SOURCES; i += 1) {
        const source = target[i];
        const x = source ? source.x : -2;
        const y = source ? source.y : -2;
        const amp = source ? source.amp : 0;
        current[i * 3] = x;
        current[i * 3 + 1] = y;
        current[i * 3 + 2] = snap || first ? amp : current[i * 3 + 2] + (amp - current[i * 3 + 2]) * 0.08;
        packed[i * 3] = current[i * 3];
        packed[i * 3 + 1] = current[i * 3 + 1];
        packed[i * 3 + 2] = current[i * 3 + 2];
      }
      first = false;

      pointer.amp += (pointer.target - pointer.amp) * 0.05;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time / 1000);
      gl.uniform1f(uDpr, dpr);
      gl.uniform3fv(uSrc, packed);
      gl.uniform3f(uMouse, pointer.x, pointer.y, reducedMotion ? 0 : pointer.amp);
      gl.uniform3fv(uInk, palette.ink);
      gl.uniform3fv(uWarn, palette.warn);
      gl.uniform3fv(uHot, palette.hot);
      gl.uniform1f(uAlpha, palette.alpha);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (time: number) => {
      if (disposed || !animated()) {
        running = false;
        return;
      }
      draw(time, false);
      requestAnimationFrame(loop);
    };

    const start = () => {
      if (disposed || running || !animated()) return;
      running = true;
      requestAnimationFrame(loop);
    };

    const redraw = () => {
      if (disposed) return;
      if (animated()) start();
      else draw(0, true);
    };
    redrawRef.current = redraw;

    const resize = () => {
      dpr = fieldPixelRatio(window.devicePixelRatio);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      gl!.viewport(0, 0, canvas.width, canvas.height);
      redraw();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "function") {
      intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        visible = !!entry?.isIntersecting;
        if (visible) start();
        else draw(0, true);
      });
      intersectionObserver.observe(canvas);
    }

    const themeObserver = new MutationObserver(() => {
      palette = readPalette(probeContext);
      redraw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const onVisibilityChange = () => {
      if (document.hidden) draw(0, true);
      else start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onMotionChange = () => {
      reducedMotion = !!motionQuery?.matches;
      redraw();
    };
    motionQuery?.addEventListener?.("change", onMotionChange);

    // A lost context (driver reset, GPU switch, tab discarded) leaves the
    // canvas blank; hiding it hands the hero back to its CSS background.
    const onContextLost = (event: Event) => {
      event.preventDefault();
      disposed = true;
      running = false;
      canvas.dataset.fallback = "true";
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    const target = pointerTarget?.current ?? canvas.parentElement;
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
      pointer.target = 1;
    };
    const onPointerLeave = () => {
      pointer.target = 0;
    };
    target?.addEventListener("pointermove", onPointerMove);
    target?.addEventListener("pointerleave", onPointerLeave);

    resize();
    start();

    return () => {
      disposed = true;
      running = false;
      visible = false;
      redrawRef.current = null;
      canvas.removeEventListener("webglcontextlost", onContextLost);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery?.removeEventListener?.("change", onMotionChange);
      target?.removeEventListener("pointermove", onPointerMove);
      target?.removeEventListener("pointerleave", onPointerLeave);
      try {
        gl?.deleteProgram(program);
        gl?.deleteBuffer(buffer);
      } catch {
        /* context already gone */
      }
    };
  }, [pointerTarget]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full data-[fallback=true]:hidden",
        className,
      )}
    />
  );
}
