import { Activity, GitPullRequest, Package, ShieldAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SITE_REPOSITORY_URL } from "@/config/site";

const HERO_EVENTS = [
  { icon: <ShieldAlert size={15} />, label: "Critical package alert", value: "+100", tone: "text-danger" },
  { icon: <Activity size={15} />, label: "Workflow failed on main", value: "+60", tone: "text-danger" },
  { icon: <GitPullRequest size={15} />, label: "Open review queue", value: "+15 each", tone: "text-primary" },
  { icon: <Package size={15} />, label: "Package inventory", value: "runtime scoped", tone: "text-foreground-muted" },
];

export function SignalFieldHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/70 bg-background">
      <SignalLanesCanvas />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_65%_36%,rgba(42,139,255,0.16),transparent_34%),linear-gradient(180deg,rgba(17,24,39,0.18),rgba(5,7,10,0.86))]" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-118px)] max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-[0.93fr_1.07fr] md:px-8 md:py-16 lg:min-h-[680px]">
        <div className="max-w-2xl">
          <h1 className="font-headline text-4xl font-semibold leading-[1.04] text-foreground sm:text-5xl md:text-6xl">
            Repository triage for urgent maintenance.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-foreground-muted sm:text-lg sm:leading-8">
            Prioritize security alerts, failed workflows, stale branches, and risky dependencies in one queue.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/app"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open console
            </Link>
            <a
              href={SITE_REPOSITORY_URL}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background/35 px-5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-surface-1/80"
            >
              View source
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-x-6 -inset-y-8 rounded-[2rem] bg-background/45 blur-2xl" />
          <div className="relative overflow-hidden rounded-xl border border-border/80 bg-background/82 p-4 shadow-2xl shadow-background/45 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <p className="font-headline text-title font-semibold text-foreground">Signal field</p>
              <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">Snapshot safe</p>
            </div>
            <div className="mt-4 grid gap-3">
              {HERO_EVENTS.map((event) => (
                <SignalRow key={event.label} icon={event.icon} label={event.label} value={event.value} tone={event.tone} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SignalRow({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 rounded-lg border border-border/70 bg-surface-1/45 px-3 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className={tone}>{icon}</span>
        <span className="truncate font-semibold text-foreground-muted">{label}</span>
      </div>
      <span className="shrink-0 font-mono text-xs text-foreground-subtle">{value}</span>
    </div>
  );
}

function SignalLanesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let disposed = false;
    let renderer: ((elapsed: number) => void) | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * scale));
      const height = Math.max(1, Math.floor(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const start = () => {
      cancelAnimationFrame(frame);
      resize();
      renderer = createWebGlRenderer(canvas) ?? createCanvasRenderer(canvas);
      const startedAt = performance.now();

      const draw = (now: number) => {
        if (disposed || !renderer) {
          return;
        }
        resize();
        const elapsed = media.matches ? 0 : (now - startedAt) / 1000;
        renderer(elapsed);
        if (!media.matches) {
          frame = requestAnimationFrame(draw);
        }
      };

      draw(startedAt);
    };

    start();
    window.addEventListener("resize", start);
    media.addEventListener("change", start);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", start);
      media.removeEventListener("change", start);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-95" />;
}

function createWebGlRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) {
    return null;
  }

  try {
    const vertexSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fragmentSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;

      float lane(float y, float center, float width) {
        return smoothstep(width, 0.0, abs(y - center));
      }

      float pulse(float x, float speed, float offset) {
        float p = fract(x * 0.86 - u_time * speed + offset);
        return smoothstep(0.22, 0.0, abs(p - 0.5));
      }

      vec3 laneColor(float index) {
        if (index < 0.5) return vec3(0.18, 0.56, 1.0);
        if (index < 1.5) return vec3(1.0, 0.77, 0.22);
        if (index < 2.5) return vec3(1.0, 0.24, 0.22);
        return vec3(0.22, 0.74, 0.54);
      }

      void addLane(inout vec3 color, vec2 uv, float index, float base, float amp, float freq, float phase, float speed) {
        float x = uv.x;
        float curve = base + sin(x * freq + phase) * amp + sin(x * (freq * 0.42) - phase) * amp * 0.42;
        float body = lane(uv.y, curve, 0.010);
        float halo = lane(uv.y, curve, 0.036);
        float moving = pulse(x, speed, phase * 0.11);
        vec3 semantic = laneColor(index);
        color += semantic * halo * 0.060;
        color += semantic * body * (0.18 + moving * 0.56);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv.y = 1.0 - uv.y;
        float vignette = smoothstep(1.02, 0.18, distance(uv, vec2(0.62, 0.42)));
        vec3 color = vec3(0.010, 0.014, 0.020) + vec3(0.020, 0.040, 0.060) * vignette;

        addLane(color, uv, 0.0, 0.24, 0.030, 7.5, 0.6, 0.075);
        addLane(color, uv, 1.0, 0.38, 0.045, 6.2, 2.4, 0.055);
        addLane(color, uv, 2.0, 0.55, 0.040, 5.8, 4.8, 0.045);
        addLane(color, uv, 3.0, 0.70, 0.035, 7.0, 1.8, 0.062);

        float grid = smoothstep(0.010, 0.0, abs(fract(uv.x * 8.0) - 0.5)) * 0.010;
        color += vec3(0.20, 0.45, 0.72) * grid * smoothstep(0.92, 0.14, uv.y);
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const program = createProgram(gl, vertexSource, fragmentSource);
    const buffer = gl.createBuffer();
    if (!buffer) {
      return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "a_position");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const time = gl.getUniformLocation(program, "u_time");

    return (elapsed: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.005, 0.007, 0.011, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(position);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
  } catch {
    return null;
  }
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Unable to create WebGL program");
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Unable to link WebGL program");
  }
  return program;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create WebGL shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Unable to compile WebGL shader");
  }
  return shader;
}

function createCanvasRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  const lanes = [
    { color: "rgba(42, 139, 255, 0.55)", y: 0.24, speed: 0.08 },
    { color: "rgba(245, 179, 38, 0.50)", y: 0.38, speed: 0.06 },
    { color: "rgba(255, 72, 68, 0.50)", y: 0.55, speed: 0.05 },
    { color: "rgba(61, 191, 143, 0.46)", y: 0.70, speed: 0.07 },
  ];

  return (elapsed: number) => {
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgb(3, 5, 8)";
    context.fillRect(0, 0, width, height);

    lanes.forEach((lane, index) => {
      context.beginPath();
      for (let x = -20; x <= width + 20; x += 20) {
        const ratio = x / width;
        const y = height * (lane.y + Math.sin(ratio * 7 + index) * 0.035);
        if (x === -20) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.strokeStyle = lane.color;
      context.lineWidth = 1.5 * Math.min(window.devicePixelRatio || 1, 2);
      context.stroke();

      const pulseX = ((elapsed * lane.speed + index * 0.21) % 1) * width;
      const pulseY = height * (lane.y + Math.sin((pulseX / width) * 7 + index) * 0.035);
      context.beginPath();
      context.arc(pulseX, pulseY, 5 * Math.min(window.devicePixelRatio || 1, 2), 0, Math.PI * 2);
      context.fillStyle = lane.color;
      context.fill();
    });
  };
}
