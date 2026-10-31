import { beep } from "./audio";

export type Status = "menu" | "playing" | "paused" | "over";
export interface Snapshot {
  status: Status;
  score: number;
  best: number;
  lives: number;
  combo: number;
  mult: number;
  level: number;
  shield: boolean;
  slow: number;
  magnet: number;
  orbs: number;
}
type Kind = "orb" | "rock" | "shield" | "slow" | "magnet";
interface Obj {
  kind: Kind;
  ring: number;
  a: number;
  w: number;
  age: number;
  life: number;
  spin: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  c: string;
  s: number;
}

const S = 600,
  C = S / 2,
  TAU = Math.PI * 2;
const RINGS = [125, 205];
const COLORS: Record<Kind, string> = {
  orb: "#5cf2c8",
  rock: "#ff6b5e",
  shield: "#6fb6ff",
  slow: "#b48cff",
  magnet: "#ffd166",
};
const GLYPH: Record<string, string> = { shield: "S", slow: "T", magnet: "M" };
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Engine {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private objs: Obj[] = [];
  private parts: Particle[] = [];
  private stars = Array.from({ length: 90 }, () => ({ x: rand(0, S), y: rand(0, S), r: rand(0.4, 1.5), t: rand(0, TAU) }));
  private sat = { a: 0, r: RINGS[0], ring: 0 };
  private spawnIn = 1;
  private shake = 0;
  private invuln = 0;
  private time = 0;
  private s: Snapshot;
  private overAt = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private onChange: (s: Snapshot) => void,
  ) {
    this.ctx = canvas.getContext("2d")!;
    let best = 0;
    try {
      best = Number(localStorage.getItem("ok-best")) || 0;
    } catch {
      /* ignore */
    }
    this.s = { status: "menu", score: 0, best, lives: 3, combo: 0, mult: 1, level: 1, shield: false, slow: 0, magnet: 0, orbs: 0 };
    this.emit();
  }

  private emit() {
    this.onChange({ ...this.s });
  }

  resize(size: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform((size * dpr) / S, 0, 0, (size * dpr) / S, 0, 0);
    if (this.s.status !== "playing") this.draw();
  }

  run() {
    this.last = performance.now();
    const f = (n: number) => {
      this.raf = requestAnimationFrame(f);
      this.frame(n);
    };
    this.raf = requestAnimationFrame(f);
  }
  destroy() {
    cancelAnimationFrame(this.raf);
  }

  start() {
    Object.assign(this.s, { status: "playing", score: 0, lives: 3, combo: 0, mult: 1, level: 1, shield: false, slow: 0, magnet: 0, orbs: 0 });
    this.objs = [];
    this.parts = [];
    this.sat = { a: -Math.PI / 2, r: RINGS[0], ring: 0 };
    this.spawnIn = 0.8;
    this.invuln = 0;
    this.shake = 0;
    beep(440, 0.15, "triangle", 0.06, 880);
    this.emit();
  }

  toggleRing() {
    if (this.s.status !== "playing") return;
    this.sat.ring ^= 1;
    beep(this.sat.ring ? 520 : 380, 0.07, "square", 0.025);
    this.burst(this.satPos().x, this.satPos().y, "#ffffff", 6, 60);
  }

  togglePause() {
    if (this.s.status === "playing") {
      this.s.status = "paused";
      this.emit();
    } else if (this.s.status === "paused") {
      this.s.status = "playing";
      this.last = performance.now();
      this.emit();
    }
  }

  canRestart() {
    return performance.now() - this.overAt > 700;
  }

  pauseIfPlaying() {
    if (this.s.status === "playing") this.togglePause();
  }

  private frame(now: number) {
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    if (this.s.status === "playing") {
      this.acc += dt;
      while (this.acc >= 1 / 60) {
        this.update(1 / 60);
        this.acc -= 1 / 60;
      }
    } else this.acc = 0;
    this.time += dt;
    this.draw();
  }

  private satPos() {
    return { x: C + Math.cos(this.sat.a) * this.sat.r, y: C + Math.sin(this.sat.a) * this.sat.r };
  }

  private burst(x: number, y: number, c: string, n: number, speed: number) {
    for (let i = 0; i < n && this.parts.length < 300; i++) {
      const a = rand(0, TAU),
        v = rand(speed * 0.3, speed);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: rand(0.3, 0.7), c, s: rand(1.5, 3.5) });
    }
  }

  private update(dt: number) {
    const s = this.s;
    s.level = Math.min(10, 1 + Math.floor(s.score / 250));
    const f = s.slow > 0 ? 0.5 : 1,
      t = dt * f;
    s.slow = Math.max(0, s.slow - dt);
    s.magnet = Math.max(0, s.magnet - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.shake = Math.max(0, this.shake - dt * 30);

    this.sat.a += (1.7 + s.level * 0.12) * t;
    this.sat.r += (RINGS[this.sat.ring] - this.sat.r) * Math.min(1, t * 16);

    this.spawnIn -= t;
    if (this.spawnIn <= 0) {
      this.spawnIn = Math.max(0.4, 1.25 - s.level * 0.08);
      const roll = Math.random();
      const kind: Kind = roll < 0.07 ? (["shield", "slow", "magnet"] as const)[Math.floor(Math.random() * 3)] : roll < 0.07 + 0.32 + s.level * 0.03 ? "rock" : "orb";
      this.objs.push({
        kind,
        ring: Math.random() < 0.5 ? 0 : 1,
        a: this.sat.a + rand(1.2, TAU - 1.2),
        w: -(0.5 + s.level * 0.07 + rand(0, 0.35)),
        age: 0,
        life: kind === "rock" ? 10 : 8,
        spin: rand(0, TAU),
      });
    }

    const sp = this.satPos();
    for (const o of this.objs) {
      o.a += o.w * t;
      o.age += t;
      o.spin += t * 2;
      const x = C + Math.cos(o.a) * RINGS[o.ring],
        y = C + Math.sin(o.a) * RINGS[o.ring];
      const d = Math.hypot(x - sp.x, y - sp.y);
      if (o.kind === "rock") {
        if (d < 24 && this.invuln === 0 && o.age > 0.4) {
          o.age = 99;
          this.burst(x, y, COLORS.rock, 22, 140);
          if (s.shield) {
            s.shield = false;
            this.invuln = 0.6;
            beep(300, 0.2, "triangle", 0.07, 600);
          } else {
            s.lives--;
            s.combo = 0;
            s.mult = 1;
            this.invuln = 1.4;
            if (!reduceMotion) this.shake = 12;
            beep(180, 0.3, "sawtooth", 0.08, 60);
            if (s.lives <= 0) this.gameOver();
          }
        }
      } else if (o.age > 0.3 && (d < 26 || (o.kind === "orb" && s.magnet > 0 && d < 90))) {
        o.age = 99;
        this.burst(x, y, COLORS[o.kind], 14, 110);
        if (o.kind === "orb") {
          s.combo++;
          s.orbs++;
          s.mult = Math.min(5, 1 + Math.floor(s.combo / 5));
          s.score += 10 * s.mult;
          beep(600 + Math.min(s.combo, 20) * 40, 0.1, "sine", 0.07);
        } else {
          if (o.kind === "shield") s.shield = true;
          else s[o.kind] = 6;
          s.score += 25;
          beep(700, 0.25, "triangle", 0.07, 1200);
        }
      }
    }
    const before = this.objs.length;
    this.objs = this.objs.filter((o) => {
      if (o.age >= o.life && o.age < 90 && o.kind === "orb") {
        s.combo = 0;
        s.mult = 1;
      }
      return o.age < o.life;
    });
    if (this.objs.length !== before || s.status === "playing") this.tick();

    if (!reduceMotion && Math.random() < 0.6) this.parts.push({ x: sp.x, y: sp.y, vx: 0, vy: 0, l: 0.35, c: "#8fa2ff", s: 2.5 });
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.l -= dt;
    }
    this.parts = this.parts.filter((p) => p.l > 0);
  }

  private tickN = 0;
  private tick() {
    if (++this.tickN % 6 === 0) this.emit();
  }

  private gameOver() {
    this.s.status = "over";
    this.overAt = performance.now();
    if (this.s.score > this.s.best) {
      this.s.best = this.s.score;
      try {
        localStorage.setItem("ok-best", String(this.s.best));
      } catch {
        /* ignore */
      }
    }
    beep(220, 0.6, "sawtooth", 0.07, 55);
    this.emit();
  }

  private draw() {
    const g = this.ctx;
    g.save();
    g.clearRect(0, 0, S, S);
    const bg = g.createRadialGradient(C, C, 20, C, C, 420);
    bg.addColorStop(0, "#151a3d");
    bg.addColorStop(1, "#080b1c");
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);
    if (this.shake > 0) g.translate(rand(-this.shake, this.shake) / 2, rand(-this.shake, this.shake) / 2);

    for (const st of this.stars) {
      g.globalAlpha = 0.4 + 0.4 * Math.sin(this.time * 1.5 + st.t);
      g.fillStyle = "#cfd6ff";
      g.beginPath();
      g.arc(st.x, st.y, st.r, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;

    RINGS.forEach((r, i) => {
      g.strokeStyle = this.sat.ring === i ? "rgba(143,162,255,.55)" : "rgba(143,162,255,.18)";
      g.lineWidth = this.sat.ring === i ? 2 : 1.5;
      g.setLineDash([6, 10]);
      g.beginPath();
      g.arc(C, C, r, 0, TAU);
      g.stroke();
    });
    g.setLineDash([]);

    const pl = g.createRadialGradient(C - 18, C - 18, 4, C, C, 58);
    pl.addColorStop(0, "#9b7cff");
    pl.addColorStop(1, "#2a1d6e");
    g.shadowColor = "#7c5cff";
    g.shadowBlur = 40;
    g.fillStyle = pl;
    g.beginPath();
    g.arc(C, C, 52, 0, TAU);
    g.fill();
    g.shadowBlur = 0;

    for (const o of this.objs) {
      const x = C + Math.cos(o.a) * RINGS[o.ring],
        y = C + Math.sin(o.a) * RINGS[o.ring];
      g.globalAlpha = Math.max(0, Math.min(1, o.age / 0.4, (o.life - o.age) / 1));
      g.shadowColor = COLORS[o.kind];
      g.shadowBlur = 16;
      g.fillStyle = COLORS[o.kind];
      if (o.kind === "orb") {
        g.beginPath();
        g.arc(x, y, 8, 0, TAU);
        g.fill();
      } else if (o.kind === "rock") {
        g.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = o.spin + (i / 7) * TAU,
            r = i % 2 ? 11 : 16;
          g[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        g.closePath();
        g.fill();
      } else {
        g.lineWidth = 3;
        g.strokeStyle = COLORS[o.kind];
        g.beginPath();
        g.arc(x, y, 13, 0, TAU);
        g.stroke();
        g.shadowBlur = 0;
        g.font = "700 13px Sora, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(GLYPH[o.kind], x, y + 1);
      }
      g.shadowBlur = 0;
      g.globalAlpha = 1;
    }

    for (const p of this.parts) {
      g.globalAlpha = Math.max(0, p.l * 2);
      g.fillStyle = p.c;
      g.beginPath();
      g.arc(p.x, p.y, p.s, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;

    {
      const { x, y } = this.satPos();
      if (this.invuln === 0 || Math.floor(this.time * 14) % 2) {
        g.save();
        g.translate(x, y);
        g.rotate(this.sat.a + (Math.PI / 2) * (this.sat.ring ? -1 : 1));
        g.shadowColor = "#fff";
        g.shadowBlur = 14;
        g.fillStyle = "#f4f6ff";
        g.beginPath();
        g.moveTo(0, -11);
        g.lineTo(8, 9);
        g.lineTo(0, 5);
        g.lineTo(-8, 9);
        g.closePath();
        g.fill();
        g.restore();
        if (this.s.shield) {
          g.strokeStyle = COLORS.shield;
          g.lineWidth = 2.5;
          g.beginPath();
          g.arc(x, y, 20, 0, TAU);
          g.stroke();
        }
        if (this.s.magnet > 0) {
          g.strokeStyle = "rgba(255,209,102,.35)";
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(x, y, 90, 0, TAU);
          g.stroke();
        }
      }
    }
    g.restore();
  }
}
