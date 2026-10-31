import { useCallback, useEffect, useRef, useState } from "react";
import { Engine, Snapshot } from "./game/engine";
import { muted, setMuted } from "./game/audio";

const INITIAL: Snapshot = {
  status: "menu",
  score: 0,
  best: 0,
  lives: 3,
  combo: 0,
  mult: 1,
  level: 1,
  shield: false,
  slow: 0,
  magnet: 0,
  orbs: 0,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [s, setS] = useState<Snapshot>(INITIAL);
  const [mute, setMute] = useState(muted);

  useEffect(() => {
    const e = new Engine(canvasRef.current!, setS);
    engine.current = e;
    const ro = new ResizeObserver(([entry]) => e.resize(Math.floor(entry.contentRect.width)));
    ro.observe(boxRef.current!);
    e.run();
    const pause = () => e.pauseIfPlaying();
    const onVis = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      e.destroy();
      ro.disconnect();
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const act = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    if (s.status === "playing") e.toggleRing();
    else if (s.status === "paused") e.togglePause();
    else if (s.status === "over") {
      if (e.canRestart()) e.start();
    } else e.start();
  }, [s.status]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(ev.code)) {
        if ((ev.target as HTMLElement).tagName === "BUTTON") return;
        ev.preventDefault();
        if (!ev.repeat) act();
      } else if (ev.code === "KeyP" || ev.code === "Escape") engine.current?.togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  const playing = s.status === "playing";

  return (
    <main className="app">
      <header className="hud" aria-live="off">
        <div className="stat">
          <span>Score</span>
          <strong>{s.score}</strong>
        </div>
        <div className="stat">
          <span>Best</span>
          <strong>{s.best}</strong>
        </div>
        <div className="stat lives" aria-label={`${s.lives} lives`}>
          {[0, 1, 2].map((i) => (
            <i key={i} className={i < s.lives ? "on" : ""} />
          ))}
        </div>
        <div className="stat">
          <span>Combo</span>
          <strong>×{s.mult}</strong>
        </div>
        <div className="tools">
          <button
            onClick={(ev) => {
              ev.currentTarget.blur();
              engine.current?.togglePause();
            }}
            aria-label="Pause"
            disabled={!playing && s.status !== "paused"}
          >
            {s.status === "paused" ? "▶" : "❚❚"}
          </button>
          <button
            onClick={(ev) => {
              ev.currentTarget.blur();
              setMuted(!mute);
              setMute(!mute);
            }}
            aria-label={mute ? "Unmute" : "Mute"}
          >
            {mute ? "🔇" : "🔊"}
          </button>
        </div>
      </header>

      <div
        ref={boxRef}
        className="stage"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).tagName !== "BUTTON") act();
        }}
      >
        <canvas ref={canvasRef} aria-label="Orbit Keeper game board" role="img" />
        <div className="chips">
          {s.shield && <span style={{ "--c": "#6fb6ff" } as React.CSSProperties}>Shield</span>}
          {s.slow > 0 && <span style={{ "--c": "#b48cff" } as React.CSSProperties}>Slow {Math.ceil(s.slow)}s</span>}
          {s.magnet > 0 && <span style={{ "--c": "#ffd166" } as React.CSSProperties}>Magnet {Math.ceil(s.magnet)}s</span>}
        </div>

        {s.status !== "playing" && (
          <div className="overlay">
            {s.status === "menu" && (
              <>
                <h1>Orbit Keeper</h1>
                <p>Tap to switch orbits. Collect green energy, dodge red debris.</p>
                <ul className="legend">
                  <li>
                    <b style={{ background: "#6fb6ff" }}>S</b>Shield
                  </li>
                  <li>
                    <b style={{ background: "#b48cff" }}>T</b>Slow time
                  </li>
                  <li>
                    <b style={{ background: "#ffd166" }}>M</b>Magnet
                  </li>
                </ul>
                <button className="cta" onClick={() => engine.current?.start()}>
                  Start game
                </button>
                <small>Space, arrow keys, click or tap · P to pause</small>
              </>
            )}
            {s.status === "paused" && (
              <>
                <h2>Paused</h2>
                <button className="cta" onClick={() => engine.current?.togglePause()}>
                  Resume
                </button>
              </>
            )}
            {s.status === "over" && (
              <>
                <h2>{s.score >= s.best && s.score > 0 ? "New best!" : "Signal lost"}</h2>
                <div className="results">
                  <div>
                    <strong>{s.score}</strong>
                    <span>Score</span>
                  </div>
                  <div>
                    <strong>{s.orbs}</strong>
                    <span>Orbs</span>
                  </div>
                  <div>
                    <strong>{s.level}</strong>
                    <span>Level</span>
                  </div>
                </div>
                <button className="cta" onClick={() => engine.current?.start()}>
                  Play again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
